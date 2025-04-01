interface CryptoPrice {
  id: number
  name: string
  symbol: string
  quote: {
    USD: {
      price: number
      volume_24h: number
      market_cap: number
    }
  }
}

async function fetchData() {
  try {
    const sheetResponse = await fetch(
      'https://sheets.googleapis.com/v4/spreadsheets/1O7wvWfMHGh9wQo3EfjZ2AVU8np7xRc1f5z1X5XEqvx0/values/Sheet1?key=AIzaSyAa8aXxiHAQ4wWVjRy3OfDSu8AhoRydeMw',
    )
    const sheetData = await sheetResponse.json()

    if (!sheetData.values) {
      throw new Error('No data from Google Sheets.')
    }

    const portfolio: string[][] = sheetData.values.slice(1)
    console.log('Data from Google Sheets:', portfolio)

    const cmcResponse = await fetch('/api/v1/cryptocurrency/listings/latest', {
      method: 'GET',
      headers: {
        'X-CMC_PRO_API_KEY': '4dbaac56-0466-4fe4-843a-c802816553b1',
        Accept: 'application/json',
      },
    })
    const cmcData = await cmcResponse.json()

    if (!cmcData.data) {
      throw new Error('No data from CoinMarketCap.')
    }

    const cryptocurrencies: CryptoPrice[] = cmcData.data
    console.log('Data from CoinMarketCap:', cryptocurrencies)

    let tableHTML = "<div class='table-container'><table class='crypto-table'>"
    tableHTML +=
      '<thead><tr><th>№</th><th>Cryptocurrency</th><th>Quantity</th><th>Price (USD)</th><th>Total Value (USD)</th></tr></thead><tbody>'

    portfolio.forEach((row: string[], index: number) => {
      const cryptoName = row[1]
      const amount = parseFloat(row[2])

      const crypto = cryptocurrencies.find(
        (c) => c.name.toLowerCase() === cryptoName.toLowerCase(),
      )
      if (crypto) {
        const price = crypto.quote.USD.price
        const totalValue = amount * price
        tableHTML += `
          <tr>
            <td data-label="№">${index + 1}</td>
            <td data-label="Cryptocurrency">${cryptoName}</td>
            <td data-label="Quantity">${amount}</td>
            <td data-label="Price  (USD)">$${price.toFixed(2)}</td>
            <td data-label="Total Value (USD)">$${totalValue.toFixed(2)}</td>
          </tr>
        `
      } else {
        console.warn(`Cryptocurrency not found: ${cryptoName}`)
      }
    })

    tableHTML += '</tbody></table></div>'

    const tableContainer = document.createElement('div')
    tableContainer.id = 'crypto-table'
    tableContainer.innerHTML = tableHTML

    document.body.appendChild(tableContainer)
  } catch (error) {
    console.error('Error retrieving data:', error)
  }
}

fetchData()
