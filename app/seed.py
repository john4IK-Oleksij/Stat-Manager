from mysql.connector.pooling import MySQLConnectionPool


def init_and_seed_db(pool: MySQLConnectionPool):
    """
    Створює таблиці categories та expenses (якщо не існують)
    та наповнює їх початковими даними, якщо таблиці порожні.
    """
    conn = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor()

        # 1. Створюємо таблицю категорій
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `categories` (
                `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` varchar(50) NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_categories_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )

        # 2. Створюємо таблицю витрат
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `expenses` (
                `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                `title` varchar(100) NOT NULL,
                `amount` decimal(12,2) NOT NULL,
                `spent_on` date NOT NULL,
                `category_id` bigint(20) UNSIGNED NOT NULL,
                PRIMARY KEY (`id`),
                KEY `fk_expense_category` (`category_id`),
                CONSTRAINT `fk_expense_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )
        conn.commit()

        # 3. Перевіряємо, чи є категорії в базі
        cursor.execute("SELECT COUNT(*) FROM `categories`")
        count = cursor.fetchone()[0]

        if count == 0:
            print("[DB Seed] Categories table is empty. Seeding initial categories and expenses...")
            initial_categories = [
                (1, "Їжа"),
                (2, "Транспорт"),
                (3, "Розваги"),
                (4, "Здоров'я"),
                (5, "Groceries"),
                (7, "Food"),
            ]
            cursor.executemany(
                "INSERT INTO `categories` (`id`, `name`) VALUES (%s, %s)",
                initial_categories,
            )

            initial_expenses = [
                (1, "Продукти", 820.50, "2026-03-05", 1),
                (2, "Обід", 150.00, "2026-03-12", 1),
                (3, "Кава", 60.00, "2026-04-02", 1),
                (4, "Метро", 40.00, "2026-03-07", 2),
                (5, "Таксі", 220.00, "2026-04-10", 2),
                (6, "Кіно", 180.00, "2026-04-15", 3),
                (7, "Weekly groceries", 45.50, "2026-10-24", 5),
            ]
            cursor.executemany(
                "INSERT INTO `expenses` (`id`, `title`, `amount`, `spent_on`, `category_id`) VALUES (%s, %s, %s, %s, %s)",
                initial_expenses,
            )
            conn.commit()
            print("[DB Seed] Initial categories and expenses successfully restored!")
        else:
            print(f"[DB Seed] Database already contains {count} categories. Skipping seed.")

        cursor.close()
    except Exception as exc:
        print(f"[DB Seed] Notice during DB initialization: {exc}")
    finally:
        if conn and conn.is_connected():
            conn.close()
