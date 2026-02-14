from flask import Flask, render_template, current_app
from flask_frozen import Freezer
import requests
import os
import time

app = Flask(__name__)
app.config.from_object('config.Config')
freezer = Freezer(app)

@app.route('/')
def home():
    screenshots = current_app.config['SCREENSHOTS']
    extension_url = current_app.config['EXTENSION_URL']
    reader_url = current_app.config['READER_URL']
    sample_articles = current_app.config['SAMPLE_ARTICLES']
    return render_template('home.html', 
        screenshots=screenshots,
        current_time=int(time.time()),
        extension_url=extension_url,
        reader_url=reader_url,
        sample_articles=sample_articles
        )

@app.route('/features.html')
def features():
    return render_template('features.html')

@app.route('/install.html')
def install():
    extension_url = current_app.config['EXTENSION_URL']
    return render_template('install.html', 
        extension_url=extension_url, 
        current_time=int(time.time())
        )

@app.route('/faq.html')
def faq():
    return render_template('faq.html')

@app.route('/contact.html')
def contact():
    return render_template('contact.html')

@app.route('/privacy-policy.html')
def privacy_policy():
    return render_template('privacy_policy.html')

# Add these routes to your existing routes.py file

@app.route('/premium.html')
def premium():
    return render_template('premium.html')

@app.route('/payment.html')
def payment():
    return render_template('payment.html')

@app.route('/payment-success.html')
def payment_success():
    return render_template('payment_success.html')

@app.context_processor
def inject_email():
    return dict(email=current_app.config['EMAIL'])

if __name__ == "__main__":
    app.run(debug=True)
