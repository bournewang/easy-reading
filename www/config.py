import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    EXTENSION_URL = "https://chromewebstore.google.com/detail/english-reader/plipgafgeeplbfgpjednfhfbcjdeeejk"
    EMAIL = "service@englishreader.org"
    READER_URL = "https://read.english-reader.com/"
    SCREENSHOTS = [
        {
            'filename': 'screenshot-reader.jpg',
            'alt': 'Reader Mode'
        },
        {
            'filename': 'history.jpg',
            'alt': 'Reading History'
        },
        {
            'filename': 'resource.jpg',
            'alt': 'Reading Resources'
        }
    ]    
    SAMPLE_ARTICLES = [
        {'title': 'European stocks steady after US markets plunge', 'url': 'https://www.bbc.com/news/articles/c4gdwgjkk1no'},
        {'title': 'From chatbots to intelligent toys: How AI is booming in China', 'url': 'https://www.bbc.com/news/articles/ckg8jqj393eo'},
        {'title': 'Thousands report outages of Musk\'s X platform in US and UK', 'url': 'https://www.bbc.com/news/articles/c62x5k44rl0o'},
        {'title': 'Ontario says it will slap a 25% surcharge on US-bound electricity', 'url': 'https://www.bbc.com/news/articles/c5yrpnr6kr2o'},
        {'title': 'Is this the face of teenage queen Lady Jane Grey?', 'url': 'https://www.bbc.com/news/articles/c4g08z0wnvxo'},
        {'title': 'Banksy take on Vettriano work sells for £4.3m', 'url': 'https://www.bbc.com/news/articles/cn7vd63z2zpo'},
        {'title': 'Argentina flooding: 16 killed as two girls swept away by rising waters', 'url': 'https://www.theguardian.com/world/2025/mar/10/argentina-flooding'},
        {'title': 'Trump’s USAid cuts will have huge impact on global climate finance, data shows', 'url': 'https://www.theguardian.com/environment/2025/mar/10/trumps-usaid-cuts-will-have-huge-impact-on-global-climate-finance-data-shows'},
        {'title': "Switzerland told it must do better on climate after older women’s ECHR win", 'url': 'https://www.theguardian.com/environment/2025/mar/07/switzerland-do-better-climate-older-womens-echr-win-human-rights'}
    ]
