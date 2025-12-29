from models.database import SessionLocal, User


def get_all_users():
    """Return all users from the database."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return users
    finally:
        db.close()


def print_all_users():
    """Fetch all users and print their column data to the console."""
    users = get_all_users()
    for u in users:
        data = {col.name: getattr(u, col.name) for col in u.__table__.columns}
        print(data)


if __name__ == "__main__":
    print_all_users()
