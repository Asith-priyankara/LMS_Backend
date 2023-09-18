import {app} from './app';
require("dotenv").config({path:"./config/.env"});

app.listen(process.env.PORT, () => {    
    console.log(`App listening on port ${process.env.PORT}`);

});