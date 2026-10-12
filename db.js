const pg = require('pg');

// Connection details
const db = new pg.Client({
  user: 'postgres',          
  host: 'localhost',         
  database: 'BlogDB',        
  password: 'Mario498', 
  port: 5432,                
});

// PostgreSQL database connection
db.connect()
  .then(() => console.log('Connected to PostgreSQL database successfully!'))
  .catch((err) => console.error('Database connection error:', err.stack));

// Export the db client
module.exports = db;