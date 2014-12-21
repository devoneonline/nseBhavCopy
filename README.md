nseBhavCopy
===========

download nse daily bhavcopy file and load the data into a mongo database

You need node installed for running this.

You can pass command line parameters or update options.js with the defaults.

--fromDate - start downloading data from from this date

--toDate - keep downloading until this date

--outputFolder - where you want to download and unzip the files

--mongohost, --mongoport, --mongodb, --mongocollection - mongodb related parameters

--actionsToPerform - all/download/unzip/parse/save/analyze - so that you can skip the download and unzip steps

logs are kept in ./logs/nseData.[pid].log


