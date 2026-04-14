import os
import yfinance as yf
import pandas_ta as ta
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
import threading
import gradio as gr

def analyze_stock(ticker):
    try:
        if not ticker.endswith((".NS", ".BO")):
            ticker += ".NS"
            
        data = yf.download(ticker, period="6mo", interval="1d", progress=False)
        if data.empty: return "Stock not found."

        close = data['Close'].squeeze()
        data['RSI_14'] = ta.rsi(close, length=14)
        macd = ta.macd(close)
        if macd is not None:
            data['MACD'] = macd.iloc[:, 0]
        
        last_rsi = data['RSI_14'].iloc[-1]
        price = close.iloc[-1]
        
        signal = "NEUTRAL"
        if last_rsi < 35: signal = "🚀 BULLISH (Oversold)"
        elif last_rsi > 65: signal = "⚠️ BEARISH (Overbought)"
        
        return f"📊 *ManverIQ Report: {ticker}*\nPrice: ₹{price:.2f}\nRSI: {last_rsi:.2f}\nSignal: {signal}"
    except Exception as e:
        return f"Error: {str(e)}"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Welcome to ManverIQ! Send /stock [symbol] (e.g., /stock RELIANCE)")

async def stock_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Please provide a stock symbol.")
        return
    
    symbol = context.args[0].upper()
    report = analyze_stock(symbol)
    await update.message.reply_text(report, parse_mode="Markdown")

async def run_telegram_bot():
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        print("TELEGRAM_TOKEN not set. Telegram bot will not run.")
        return
    
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("stock", stock_command))
    
    await app.run_polling()

def start_bot_thread():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_telegram_bot())

if __name__ == "__main__":
    token = os.getenv("TELEGRAM_TOKEN")
    if token:
        threading.Thread(target=start_bot_thread, daemon=True).start()
    
    interface = gr.Interface(
        fn=analyze_stock, 
        inputs="text", 
        outputs="text", 
        title="ManverIQ Stock Advisor",
        description="Enter NSE stock symbol (e.g., RELIANCE, TCS, INFY)"
    )
    interface.launch()