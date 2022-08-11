async function searchAddress(zipcode: string) {
  let response: Response = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  );
  let json = await response.json();
  let addresses = "";
  for (let result of json.results) {
    addresses += result.address1 + result.address2 + result.address3 + " ";
  }
  return addresses;
}

let zipcode = <HTMLInputElement>document.getElementById("zipcode");
let address = document.getElementById("address");
let search = document.getElementById("search");

if (search !== null) {
  search.addEventListener("click", () => {
    if (zipcode !== null) {
      searchAddress(zipcode.value).then((addresses) => {
        console.log(addresses);
        if (address !== null) {
          address.innerText = addresses;
        }
      });
    }
  });
}
