// import formData from 'form-data';
// import fs from 'fs';
// import axios from 'axios';

// const botToken = '7359207341:AAFbJx0XXBFVfVmlKBS714nYXQFKAa6m6Kc';
// const chatId = '5186811869';

// async function sendImageToTelegram(imagePath) {
//   const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

//   const form = new formData();
//   form.append('chat_id', chatId);
//   form.append('photo', fs.createReadStream(imagePath));

//   try {
//     const response = await axios.post(url, form, {
//       headers: form.getHeaders(),
//     });
//     console.log('Image sent to Telegram:', response.data);
//   } catch (error) {
//     console.error('Error sending image:', error);
//   }
// }

// export { sendImageToTelegram };

