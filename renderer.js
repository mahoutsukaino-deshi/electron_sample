"use strict";

let grid = null;
let results;

document.getElementById("search").addEventListener("click", () => {
  const zipcode = document.getElementById("zipcode").value;
  window.api.searchAddress(zipcode).then((response) => {
    const message = document.getElementById("message");
    message.innerHTML = response.message;
    results = response.results;
    if (results === null) {
      results = [];
    }
    if (grid) {
      grid
        .updateConfig({
          data: results,
        })
        .forceRender();
    } else {
      grid = new gridjs.Grid({
        columns: [
          { id: "zipcode", name: "郵便番号" },
          { id: "address1", name: "都道府県" },
          { id: "address2", name: "市区町村" },
          { id: "address3", name: "町域" },
        ],
        data: results,
        pagination: {
          limit: 6,
        },
      }).render(document.getElementById("address_grid"));
    }
    document.getElementById("save").disabled = results.length === 0;
  });
});

document.getElementById("save").addEventListener("click", () => {
  console.log("clicked: save button");
  window.api.saveData(results);
});
