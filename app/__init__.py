from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'monte-carlo-simulator'
    
    from .views import main
    app.register_blueprint(main)
    
    return app