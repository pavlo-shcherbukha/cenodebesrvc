
set DB_URL=CLOUDANT_URL=https://*************-bluemix.cloudantnosqldb.appdomain.cloud
set DB_APIKEY=***************************************************
set DB_NAME=STORAGE_DBNAME=storagedb
set BLDIMAGE= uk.icr.io/*************/sh-storage-be
pause

ibmcloud ce application create --name sh-storage-be1 --image %BLDIMAGE% --registry-secret ********* --env %DB_URL% --env %DB_APIKEY% --env %DB_NAME% --cpu 1 --memory 2G --port 8080

pause
