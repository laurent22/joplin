$(function () {
  $("#open-menu-mobile").click(function () {
    $("#menu-mobile").animate({ "margin-right": "0px" }, 300);
  });
  $("#close-menu-mobile").click(function () {
    $("#menu-mobile").animate({ "margin-right": "-300px" }, 300);
  });
});
