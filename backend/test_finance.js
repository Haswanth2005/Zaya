import { getFinancialData } from './src/utils/yahooFinance.js';

async function run() {
  try {
    const data = await getFinancialData('AAPL', 'Apple Inc.');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
}
run();
