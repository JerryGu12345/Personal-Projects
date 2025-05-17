function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate();
}

function getData() {
  let data = Sheets.Spreadsheets.Values.get(
    "1yfFoiS8coeDKSJjp9a26q93PKfeG8nYxFdU_RpQEPjw",
    "Sheet1!A2:C");
  return data.values;
}
