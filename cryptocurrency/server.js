process.env.NTBA_FIX_350 = "true";
import puppeteer from 'puppeteer';
import axios from 'axios';
// import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const cmcApiKey = process.env.CMC_API_KEY;
const googleSheetsUrl = process.env.GOOGLE_SHEETS_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(botToken, { polling: true });

async function fetchData() {
  try {
    const sheetResponse = await axios.get(googleSheetsUrl);
    const sheetData = sheetResponse.data;

    if (!sheetData.values) {
      throw new Error('No data from Google Sheets.');
    }

    const portfolio = sheetData.values.slice(1);

    const cmcResponse = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': cmcApiKey,
      },
    });
    const cryptocurrencies = cmcResponse.data.data;

    if (!cryptocurrencies) {
      throw new Error('No data from CoinMarketCap.');
    }

    let tableHTML =
      `<html>
        <head>
          <style>
            .table-container {
              max-width: 100%;
              margin: 30px auto;
              overflow-x: auto;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              background: linear-gradient(135deg, #6e7dff, #00b0ff);
              padding: 20px;
              border: 1px solid #ddd;
              transition: all 0.3s ease-in-out;
            }
            .crypto-table {
              width: 100%;
              border-collapse: collapse;
              border-radius: 10px;
              font-family: 'Arial', sans-serif;
              margin: 0 auto;
            }
            .crypto-table th, .crypto-table td {
              padding: 15px 20px;
              text-align: left;
              border: 1px solid #ddd;
              font-size: 16px;
            }
            .crypto-table th {
              background-color: #4e73df;
              color: #fff;
            }
            .crypto-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .crypto-table tr:hover {
              background-color: #f1f1f1;
            }
          </style>
        </head>
        <body>
          <div class="table-container">
            <table class="crypto-table">
              <thead>
                <tr><th>#</th><th>Cryptocurrency</th><th>Quantity</th><th>Price (USD)</th><th>Total Value (USD)</th></tr>
              </thead>
              <tbody>`;

    portfolio.forEach((row, index) => {
      const cryptoName = row[1];
      const amount = parseFloat(row[2]);

      const crypto = cryptocurrencies.find(c => c.name.toLowerCase() === cryptoName.toLowerCase());
      if (crypto) {
        const price = crypto.quote.USD.price;
        const totalValue = amount * price;

        tableHTML +=
          `<tr>
            <td>${index + 1}</td>
            <td>${cryptoName}</td>
            <td>${amount}</td>
            <td>$${price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
          </tr>`;
      }
    });

    tableHTML += '</tbody></table></div></body></html>';

    const screenshotPath = await generateImageFromHtml(tableHTML);
    console.log(`Screenshot saved to ${screenshotPath}`);

    return screenshotPath;

  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

async function generateImageFromHtml(html) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);

  const screenshotPath = 'crypto-table.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  return screenshotPath;
}

bot.onText(/\/getData/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    const imagePath = await fetchData();

    bot.sendPhoto(chatId, imagePath, { contentType: 'image/png' });
  } catch (error) {
    console.error('Error handling /getData:', error);
    bot.sendMessage(chatId, 'An error occurred while retrieving the data. Please try again later.');
  }
});


