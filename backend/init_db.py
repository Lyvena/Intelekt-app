"""
Database initialization script for Intelekt.
Run this to create the database tables.
"""
from models.database import Base, engine, SessionLocal
from models.database.user import User
from utils.auth import get_password_hash
import sys

def init_db():
    """Initialize the database."""
    print("🔧 Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully\!")
    
    # Check if we should create a demo user
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("\n📝 No users found. Creating demo user...")
            demo_user = User(
                email="demo@intelekt.xyz",
                username="demo",
                full_name="Demo User",
                hashed_password=get_password_hash("demo123"),
                is_active=True,
                is_superuser=False
            )
            db.add(demo_user)
            db.commit()
            print("✅ Demo user created\!")
            print("   Email: demo@intelekt.xyz")
            print("   Username: demo")
            print("   Password: demo123")
        else:
            print(f"ℹ️  Database already has {user_count} user(s)")
    except Exception as e:
        print(f"❌ Error creating demo user: {e}")
        db.rollback()
    finally:
        db.close()
    
    print("\n🎉 Database initialization complete\!")

if __name__ == "__main__":
    try:
        init_db()
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        sys.exit(1)
