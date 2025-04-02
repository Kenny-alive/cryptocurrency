import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import puppeteer from 'puppeteer';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', (req, res, next) => {
  console.log('🔍 Incoming request to API:', req.originalUrl);
  next();
});
// Настройка прокси middleware
app.use('/api', createProxyMiddleware({
  target: 'https://pro-api.coinmarketcap.com',
  changeOrigin: true,
  secure: false,
  pathRewrite: { '^/api': '' },
  onProxyReq: (proxyReq, req, res) => {
    // Добавляем API-ключ CMC к каждому запросу
    proxyReq.setHeader('X-CMC_PRO_API_KEY', process.env.CMC_API_KEY);
  }
}));

// Telegram bot setup
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const bot = new TelegramBot(botToken, { polling: true });

const sheets = {
  "Sheet1": process.env.SHEET1_ID,
  "Sheet2": process.env.SHEET2_ID
};

async function getGoogleSheetsClient() {
  const auth = new GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function fetchData() {
  try {
    let allTables = "";

    const cmcResponse = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
    });

    const cryptocurrencies = cmcResponse.data.data || [];
    const btcData = cryptocurrencies.find(c => c.symbol.toUpperCase() === "BTC");
    const btcUsdPrice = btcData ? btcData.quote.USD.price : null;

    let missingCoins = [];
    let loadedSymbols = cryptocurrencies.map(c => c.symbol.toUpperCase());

    for (const [sheetName, sheetId] of Object.entries(sheets)) {
      const googleSheets = await getGoogleSheetsClient();
      const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z100",
      });

      const sheetData = response.data.values || [];
      sheetData.slice(1).forEach(row => {
        const cryptoName = sheetName === "Sheet1" ? row[3] ?? "" : row[2] ?? "";
        if (cryptoName.trim() && !loadedSymbols.includes(cryptoName.toUpperCase())) {
          missingCoins.push(cryptoName);
        }
      });
    }

    missingCoins = [...new Set(missingCoins)];

    for (const missingCoin of missingCoins) {
      if (!/^[A-Z0-9]+$/.test(missingCoin)) continue;

      const responseBySymbol = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
          params: { symbol: missingCoin.toUpperCase() },
        }
      );

      if (responseBySymbol.data.data[missingCoin.toUpperCase()]) {
        const coinData = responseBySymbol.data.data[missingCoin.toUpperCase()];
        cryptocurrencies.push(coinData);
      }
    }

    for (const [sheetName, sheetId] of Object.entries(sheets)) {
      const googleSheets = await getGoogleSheetsClient();
      const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z100",
      });

      const sheetData = response.data.values || [];
      let tableHTML = `<div class="table-container">
            <h2>${sheetName}</h2>
            <table class="crypto-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Наименование</th>
                        <th>Монета</th>
                        <th>Цена, $BTC</th>
                        <th>Цена, $</th>
                        <th>Кол-во монет</th>
                        <th>НАЧАЛО $</th>
                        <th>СЕЙЧАС $</th>
                    </tr>
                </thead>
                <tbody>`;

      sheetData.slice(1).forEach((row, index) => {
        let cmcUrl, fullName, cryptoName, amountStr, startPriceStr, currentPriceStr;

        if (sheetName === "Sheet1") {
          cmcUrl = row[1] ?? " ";
          fullName = row[2] ?? " ";
          cryptoName = row[3] ?? " ";
          amountStr = row[6] ?? " ";
          startPriceStr = row[5] ?? " ";
          currentPriceStr = row[7] ?? " ";
        } else {
          cmcUrl = row[0] ?? " ";
          fullName = row[1] ?? " ";
          cryptoName = row[2] ?? " ";
          amountStr = row[5] ?? " ";
          startPriceStr = row[7] ?? " ";
          currentPriceStr = row[8] ?? " ";
        }

        if (!cryptoName.trim() || !amountStr.trim() || /[а-яА-Я]/.test(cryptoName)) return;

        let priceUSD = "N/A";
        let priceBTC = "N/A";
        let nameColor = "";
        const crypto = cryptocurrencies.find(c => c.symbol.toUpperCase() === cryptoName.toUpperCase());

        if (crypto) {
          priceUSD = `$${crypto.quote.USD.price.toFixed(2)}`;
          if (crypto.quote.BTC) {
            priceBTC = crypto.quote.BTC.price.toFixed(8);
          } else if (btcUsdPrice) {
            priceBTC = (crypto.quote.USD.price / btcUsdPrice).toFixed(8);
          }

          if (startPriceStr.trim() !== "" && !isNaN(parseFloat(amountStr))) {
            const priceNow = crypto.quote.USD.price;
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            currentPriceStr = `$${(priceNow * amount).toFixed(2)}`;

            const startPrice = parseFloat(startPriceStr.replace(/[^0-9.-]+/g, ''));
            const currentPrice = parseFloat(currentPriceStr.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(startPrice) && !isNaN(currentPrice)) {
              nameColor = currentPrice > startPrice ? 'blue' : currentPrice < startPrice ? 'red' : '';
            }
          }
        }

        tableHTML += `
          <tr>
              <td>${index + 1}</td>
              <td style="color: ${nameColor}">${fullName}</td>
              <td>${cryptoName}</td>
              <td>${priceBTC}</td>
              <td>${priceUSD}</td>
              <td>${parseFloat(amountStr).toString()}</td>
              <td>${startPriceStr}</td>
              <td>${currentPriceStr}</td>
          </tr>`;
      });

      tableHTML += `</tbody></table></div>`;
      allTables += tableHTML;
    }

    return `<html>
          <head>
              <style>
                  .crypto-table { width: 100%; border-collapse: collapse; }
                  .crypto-table th, .crypto-table td { padding: 8px; border: 1px solid #ddd; }
                  .crypto-table th { background-color: #4e73df; color: #fff; }
                  .crypto-table tr:nth-child(even) { background-color: #f9f9f9; }
                  .crypto-table tr:hover { background-color: #f1f1f1; }
              </style>
          </head>
          <body>${allTables}</body>
      </html>`;
  } catch (error) {
    console.error('❌ Ошибка получения данных:', error);
    return '<h1>Ошибка загрузки данных</h1>';
  }
}

app.get('/', async (req, res) => {
  const html = await fetchData();
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});




