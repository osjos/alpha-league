import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Seeds sample price data for testing the PnL functionality
 */
export async function seedPriceData() {
  try {
    // Sample price data for the assets in our test ideas
    const priceData = [
      {
        symbol: "BTCUSDT",
        price: 58500,  // Current BTC price
      },
      {
        symbol: "ETHUSDT", 
        price: 2380,   // Current ETH price
      },
      {
        symbol: "SOLUSDT",
        price: 155,    // Current SOL price
      }
    ];

    const promises = priceData.map(async (data) => {
      const docRef = doc(collection(db, "prices"));
      await setDoc(docRef, {
        symbol: data.symbol,
        price: data.price,
        ts: serverTimestamp()
      });
      console.log(`Seeded price for ${data.symbol}: $${data.price}`);
    });

    await Promise.all(promises);
    console.log("✅ Price data seeded successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to seed price data:", error);
    return false;
  }
}