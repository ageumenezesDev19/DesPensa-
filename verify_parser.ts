import { loadHtmlDataFromString } from './src/utils/db_utils';
import * as fs from 'fs';

const htmlContent = fs.readFileSync('/Users/ageudev_1/Documents/Main Desktop/Work/Casa dos Temperos/Lojas dos Temperos/APPs/products.html', 'utf-8');

console.log("Testing with ignoreNcm: true");
const resultTrue = loadHtmlDataFromString(htmlContent, { ignoreNcm: true });
console.log(`Extracted products: ${resultTrue.df.length}`);
if (resultTrue.df.length > 0) {
    console.log("First product sample:", resultTrue.df[0]);
}

console.log("\nTesting with ignoreNcm: false");
const resultFalse = loadHtmlDataFromString(htmlContent, { ignoreNcm: false });
console.log(`Extracted products: ${resultFalse.df.length}`);
