import app from "./app";

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}`);
});
