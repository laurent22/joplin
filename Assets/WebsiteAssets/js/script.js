$(function () {
  $("#open-menu-mobile").click(function () {
    $("#menu-mobile").animate({ "margin-right": "0px" }, 500);
  });
  $("#close-menu-mobile").click(function () {
    $("#menu-mobile").animate({ "margin-right": "-250px" }, 500);
  });
});
