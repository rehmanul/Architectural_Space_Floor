import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
database_url = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost/spaceplan")
# Fix for Heroku/Render postgres URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
    "pool_timeout": 30,
    "max_overflow": 10
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure upload settings
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size
app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "uploads")

# Security configurations
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 300
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == "production"
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Initialize the app with the extension
db.init_app(app)

# Create upload directory if it doesn't exist
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(os.path.join(app.config["UPLOAD_FOLDER"], "processed"), exist_ok=True)

# Configure CORS for frontend integration
from flask_cors import CORS
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://0.0.0.0:5173"])

with app.app_context():
    # Import models to ensure tables are created
    import models
    db.create_all()
    
    # Import routes
    import routes
    import api_routes
