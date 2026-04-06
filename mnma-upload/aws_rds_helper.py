import os
import json
import yaml
import logging
import pymysql
from pymysql import cursors

logger = logging.getLogger(__name__)

class RDSHelper:
    def __init__(self, config):
        """
        Initialize the RDSHelper with configuration parameters.
        
        Args:
            config (dict): Configuration dictionary containing SQL queries.
        """
        self.db_instance = os.environ.get("RDS_DB_INSTANCE")
        self.database = os.environ.get("RDS_DB_NAME")
        self.user = os.environ.get("RDS_DB_USER")
        self.password = os.environ.get("RDS_DB_PASSWORD")
        self.port = os.environ.get("RDS_DB_PORT")
        self.connection = None
        self.cursor = None
        self.rds_config = config

    def get_rds_endpoint(self):
        """
        Return the database host directly from environment variable.
        For local MySQL, no AWS RDS API call needed.

        Returns:
            str: The database host address.
        """
        return self.db_instance

    def connect(self):
        """
        Establish a connection to the MySQL database and initialize the cursor.
        """
        try:
            endpoint = self.get_rds_endpoint()
            self.connection = pymysql.connect(
                host=endpoint,
                database=self.database,
                user=self.user,
                password=self.password,
                port=int(self.port),
                cursorclass=cursors.Cursor,
                connect_timeout=10,
                read_timeout=30,
                write_timeout=30
            )
            self.cursor = self.connection.cursor()
            logger.info("Connected to the database")
        except Exception as error:
            logger.error(f"Error: Could not connect to the database\n{error}")
    
    def ensure_connection(self):
        """
        Ensure the database connection is active, reconnect if needed.
        """
        try:
            if not self.connection or not self.connection.open:
                logger.info("Reconnecting to database...")
                self.connect()
            else:
                # Test connection with a ping
                self.connection.ping(reconnect=True)
        except Exception as error:
            logger.warning(f"Connection issue, reconnecting: {error}")
            self.connect()

    def disconnect(self):
        """
        Close the database cursor and connection.
        """
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("Disconnected from the database")

    def create_table(self):
        """
        Create a table in the database using the query from the configuration.
        """
        try:
            create_table_query = self.rds_config['create_table']
            self.cursor.execute(create_table_query)
            self.connection.commit()
            logger.info("Table 'peakfiles' created successfully")
        except Exception as error:
            logger.error(f"Error: Could not create table\n{error}")

    def insert_record(self, file_id, user_id, file_name, status):
        """
        Insert a record into the database.

        Args:
            file_id (str): ID of the file.
            user_id (str): ID of the user.
            file_name (str): Name of the file.
            status (str): Status of the file.
        Returns:
            str: JSON string containing the inserted record details or error message.
        """
        try:
            self.ensure_connection()
            insert_query = self.rds_config['insert_record']
            self.cursor.execute(insert_query, (file_id, user_id, file_name, status))
            self.connection.commit()
            
            # MySQL doesn't support RETURNING, so fetch the record after insert
            record_id = self.cursor.lastrowid
            self.cursor.execute("SELECT id, file_id, user_id, file_name, status FROM peakdefence WHERE id = %s", (record_id,))
            record = self.cursor.fetchone()
            
            logger.info(f"Record inserted successfully, id: {record_id}")
            return json.dumps({
                "id": record[0],
                "file_id": record[1],
                "user_id": record[2],
                "file_name": record[3],
                "status": record[4]
            })
        except Exception as error:
            logger.error(f"Error: Could not insert record\n{error}")
            if self.connection:
                self.connection.rollback()
            return json.dumps({"error": str(error)})

    def fetch_records_by_user_id(self, user_id):
        """
        Fetch records from the database by user ID.

        Args:
            user_id (str): ID of the user.

        Returns:
            str: JSON string containing the fetched records or error message.
        """
        try:
            self.ensure_connection()
            fetch_query = self.rds_config['records_by_user_id']
            self.cursor.execute(fetch_query, (user_id,))
            records = self.cursor.fetchall()
            logger.info(f"Fetched {len(records)} records, user_id: {user_id}")
            return [{
                "id": record[0],
                "file_id": record[1],
                "user_id": record[2],
                "file_name": record[3],
                "status": record[4]
            } for record in records]
        except Exception as error:
            logger.error(f"Error: Could not fetch records\n{error}")
            return {"error": str(error)}
    
    def update_status_for_files(self, file_ids, new_status):
        """
        Update the status for multiple files.

        Args:
            file_ids (list): List of file IDs to update.
            new_status (str): New status to set for the files.

        Returns:
            str: JSON string containing the updated records or error message.
        """
        try:
            self.ensure_connection()
            update_query = self.rds_config['update_files_status']
            self.cursor.execute(update_query, (new_status, file_ids))
            updated_records = self.cursor.fetchall()
            self.connection.commit()
            logger.info(f"Updated {len(updated_records)} records")
            return json.dumps([{
                "id": record[0],
                "file_id": record[1],
                "user_id": record[2],
                "file_name": record[3],
                "status": record[4]
            } for record in updated_records])
        except Exception as error:
            logger.error(f"Error: Could not update records\n{error}")
            return json.dumps({"error": str(error)})
    
    def fetch_file_statuses_by_user_id(self, user_id):
        """
        Fetch the statuses of files by user ID.

        Args:
            user_id (str): ID of the user.

        Returns:
            str: JSON string containing the fetched file statuses or error message.
        """
        try:
            if self.cursor.closed:
                self.connect()
            fetch_query = sql.SQL(self.rds_config['files_status_by_user_id'])
            self.cursor.execute(fetch_query, (user_id,))
            records = self.cursor.fetchall()
            logger.info(f"Fetched {len(records)} file statuses, user_id: {user_id}")
            return [{
                "file_name": record[0],
                "status": record[1]
            } for record in records]
        except Exception as error:
            logger.error(f"Error: Could not fetch file statuses\n{error}")
            return {"error": str(error)}
        
    def delete_document(self, file_ids, user_id):
        """
        Delete a document from the database.

        Args:
            file_ids (list): List of file IDs to delete.

        Returns:
            str: JSON string containing the result of the deletion or error message.
        """
        try:
            if self.cursor.closed:
                self.connect()
            delete_query = sql.SQL(self.rds_config['delete_files'])
            self.cursor.execute(delete_query, (file_ids, user_id))
            self.connection.commit()
            logger.info(f"Deleted {len(file_ids)} documents")
            logger.info(f"Documents deleted successfully, file_ids: {file_ids}")
            logger.info(f"Documents deleted successfully, user_id: {user_id}")
            return {
                "message": "Documents deleted successfully", 
                "file_ids": file_ids,
                "user_id": user_id
            }
        except Exception as error:
            logger.error(f"Error: Could not delete documents\n{error}")
            return {"error": str(error)}