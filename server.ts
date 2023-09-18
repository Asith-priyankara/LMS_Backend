import {app} from './app';
import connectDB from "./utils/db";
require("dotenv").config({path:"./config/.env"});

app.listen(process.env.PORT, () => {    
    console.log(`App listening on port ${process.env.PORT}`);
    connectDB();

});