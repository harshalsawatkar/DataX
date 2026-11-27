CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL
);

INSERT INTO customers (id, name, email) VALUES
    (1, 'Ada Example', 'ada@example.invalid'),
    (2, 'Lin Example', 'lin@example.invalid')
ON CONFLICT (id) DO NOTHING;
