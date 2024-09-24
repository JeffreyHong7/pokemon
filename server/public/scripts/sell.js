$("#sell-button").on("click", (event) => {
  event.preventDefault();
  $("#sell-button").text() === "Sell"
    ? $("#sell-button").text("Back")
    : $("#sell-button").text("Sell");
  $(".confirmation, #cancel").toggleClass("hide");
});
