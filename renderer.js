"use strict";

async function searchAddress(zipcode) {
  let response = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  );
  return response.json();
}

var grid = null;
document.getElementById("search").addEventListener("click", () => {
  let zipcode = document.getElementById("zipcode").value;
  searchAddress(zipcode).then((response) => {
    let message = document.getElementById("message");
    message.innerHTML = response.message;
    let results = response.results;
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
  });
});
