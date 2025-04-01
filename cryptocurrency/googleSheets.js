import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function getSpreadsheetData(spreadsheetId, range) {
  const auth = new GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

async function accessGoogleSheets() {
  const mainSpreadsheetId = process.env.SPREADSHEET_ID; // Из .env
  const mainRange = 'Sheet1!A1:D10';

  console.log(`📄 Загружаем данные из главной таблицы (${mainSpreadsheetId})...`);
  const mainData = await getSpreadsheetData(mainSpreadsheetId, mainRange);

  console.table(mainData);

  // Ищем ссылки на другие таблицы
  for (const row of mainData) {
    const link = row[1]; // Считаем, что ссылка во второй колонке
    if (link && link.includes('/spreadsheets/d/')) {
      const match = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const spreadsheetId = match[1];
        console.log(`🔗 Найдена вложенная таблица: ${spreadsheetId}`);
        const nestedData = await getSpreadsheetData(spreadsheetId, 'Sheet1!A1:Z100');
        console.log(`📊 Данные из таблицы ${spreadsheetId}:`);
        console.table(nestedData);
      }
    }
  }
}

accessGoogleSheets();

