import os
from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-only-insecure-key')

    from .views import main
    app.register_blueprint(main)

    from .demo import demo
    app.register_blueprint(demo)

    return app