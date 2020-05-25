import axios from 'axios';
import fs from 'fs';

axios.defaults.baseURL = "http://localhost:8081";

const path = __dirname + '/../demoCode/java/CPP14Parser.java'
// const path = __dirname + '/../demoCode/java/SpellCheck.java'
const output = fs.readFileSync(path);
axios.post('/processFile', {
  id:"testid",
  path,
  fileName: "CPP14Parser.java",
  content: output.toString()
}).then(() => {
  console.log("posted");
}).catch((err: any) => {
  if (err.response) {
    console.log(err.response.data);
  } else {
    console.log(err);
  }
});
