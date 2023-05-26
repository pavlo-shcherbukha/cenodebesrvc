set BLDSRC=https://github.com/pavlo-shcherbukha/cenodebesrvc.git
set BLDBRANCH=tz-000001-init
set BLDIMAGE= uk.icr.io/************/sh-storage-be

pause

ibmcloud ce build create --name sh-storage-be-bld --source %BLDSRC% --commit %BLDBRANCH% --strategy dockerfile --size medium --image %BLDIMAGE% --registry-secret ************

