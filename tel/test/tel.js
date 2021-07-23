var $table = $("#table");
var tipo = "contactos";
var zona = "parana";
var data;
var resp = Cookies.get("responsable");
var zona = Cookies.get("zona");
var win;
var reservasCount;
var clave = Cookies.get("clave");
var claveEnc;
var rTelefono,
  rDireccion,
  rFecha,
  rEstado,
  rResponsable,
  rObservaciones,
  rLocalidad, selectedPub;
var rpTelefono, rpDireccion, rpFecha, rpRespuesta;
var registrotelpretty, registrotel;
var pubs, territorios;
var limiteReservasMin = 1; //minimo de reservas sin restricciones
var limiteReservasMax = 15; //máximo de reservas antes de bloquear
var timeoutReservas = 5; //segundos de espera para hacer una reserva adicional
var tiempoMinReservas = 2.5; //minutos minimos entre reservas
var tiempoMaxReservas = 60; //dias desde la reserva mas antigua para bloquear un pub
var limiteReservasRespMin = 10; //minimo de reservas sin restricciones
var limiteReservasRespMax = 20; //máximo de reservas antes de bloquear
var tiempoMaxReservasResp = 60; //dias desde la reserva mas antigua para bloquear un resp
var reservasPub, txtReservas, maxminReservasPub, interval;
const scriptURL =
  "https://script.google.com/macros/s/AKfycbzivt4eVHnlJKOwMIHFq6n200v8eMOkx8qNJOgFf08R-ncjqa_r/exec";

function loadPubs(background) {
  if (background != true) {
    $("#cargando").modal("show");
  }
  $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/pubs?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    pubs = jsonata(
      '$.values.({"Nombre":$[0],"Grupo":$[1],"Tel":$[2],"Reservas":$number($[3])})'
    ).evaluate(jsonurl);

    var listpubs = "<option></option>";
    var item;

    $.each(pubs, function (key, value) {
      if (value["Reservas"] > 0) {
        item = value["Nombre"] + " (" + value["Reservas"] + " reservados)";
      } else {
        item = value["Nombre"];
      }
      listpubs +=
        "<option value='" + value["Nombre"] + "''>" + item + "</option>";
    });
    $("#Publicador").empty();
    $("#Publicador").append(listpubs);
    $("#ddResponsable").text(resp);
    $("#cargando").modal("hide");
  });
}

function loadClave() {
  //$('#cargando').modal('show');
  $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/claveEnc?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    claveEnc = jsonata("$.values[0][0]").evaluate(jsonurl);
  });
}

function loadJson(background) {
  if (background != true) {
    $("#cargando").modal("show");
  }
  $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/telefonos2?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    data = jsonata(
      '$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8], "Timestamp":$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]")})').evaluate(jsonurl);
    filterJson(background);
    loadPubs(true);
   
  territorios = jsonata(
    '$distinct($.Localidad)'
  ).evaluate(data);
  var listterritorios = "<option>Indistinto</option>";

  $.each(territorios, function (i) {

    listterritorios +=
      "<option>" + territorios[i] + "</option>";
  });
  $("#selZona").empty();
  $("#selZona").append(listterritorios);
});
$("#cargando").modal("hide");
};

async function revisitas(responsable,publicador) {
  await $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/revisitas?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    var revisitas = jsonata('$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8], "Timestamp":$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]")})').evaluate(jsonurl);
if (typeof responsable !== 'undefined') { revisitas = jsonata('[$[Responsable="'+responsable+'"]]').evaluate(revisitas)};
if (typeof publicador !== 'undefined') { revisitas = jsonata('[$[Responsable="'+publicador+'"]]').evaluate(revisitas)};
console.log(revisitas);
return revisitas
});
};


async function loadContacto() {
  $("#cargando").modal("show");
  if ($("#selZona").val() == "Indistinto") {
    localidad = '[Localidad!="Campaña celulares 2021"]';
  } else {
    localidad = '[Localidad="'+$("#selZona").val()+'"]';
  }
  await $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/telefonos2?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    var dataContacto = jsonata(
      '$shuffle($.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7]})[Respuesta!="Reservado"]' +
        localidad +
        ")[0]"
    ).evaluate(jsonurl);

    registrotel = dataContacto; //jsonata('$[Telefono="' + telefono + '"]').evaluate(data);
    registrotelpretty = jsonata(
      '$.{"Telefono":Telefono, "Direccion":Direccion & ", " & Localidad, "Respuesta":Respuesta, "Fecha": (Fecha & ($boolean(Turno) ?(" por la "& Turno) : ""))}'
    ).evaluate(registrotel);
    rpTelefono = registrotelpretty["Telefono"];
    rpDireccion = registrotelpretty["Direccion"];
    rpFecha = registrotelpretty["Fecha"];
    rpRespuesta = registrotelpretty["Respuesta"];
    $("#ddResponsable").text(resp);
    $("#Responsable").val(resp);
    $("#ddObservaciones").text(registrotel["Observaciones"]);
    $("#Telefono").val(registrotel["Telefono"]);
    $("#Direccion").val(registrotel["Direccion"]);
    $("#Localidad").val(registrotel["Localidad"]);
    $("#Estado").val("Reservado");
    console.log(registrotelpretty);
    rTelefono = registrotel["Telefono"];
    rDireccion = registrotel["Direccion"];
    rFecha = jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate();
    rEstado = "Reservado";
    rResponsable = resp;
    rObservaciones = "";
    rLocalidad = registrotel["Localidad"];
    $("#spPub").text(resp);
    $("#spTel").text(registrotel["Telefono"]);

    //return await submitForm();

    $("#Fecha").val(jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate());
    console.log(registrotel);
    //console.log(jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate());
  });
}

function loadResp() {
  $("#cargando").modal("show");
  $.getJSON(
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/responsables?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
  ).done(function (jsonurl) {
    var data = jsonata('$.values.({"Nombre":$[0]})').evaluate(jsonurl);
    var listitems = "";
    $("#selResponsable").empty();
    $.each(data, function (key, value) {
      listitems += "<option>" + value["Nombre"] + "</option>";
    });
    $("#selResponsable").append(listitems);
    $("#selResponsable").val(resp);
  });
  $("#cargando").modal("hide");
}

 async function filterJson(background) {
  if (background != true) {
    $("#cargando").modal("show");
  }
  var filtro = data;
  filtro = jsonata(
    '$[Respuesta="Reservado"][Responsable="' + resp + '"]'
  ).evaluate(filtro);
  console.log(filtro);
  /*if(filtro) {*/
  filtro = jsonata(
    '[$.{"Telefono":Telefono, "TelefonoBlur":Telefono, "Direccion":Direccion & ", "& Localidad, "Respuesta":Respuesta &" ("& Fecha &$string(Turno = "" ? ")": " por la "& Turno &")"), "PublicadorFecha":Publicador &" ("& Fecha &")", "Responsable":Responsable,"Days":$floor(($toMillis($now(undefined,"-0300"))-$min(Timestamp))/8.64e+7)}]'
  ).evaluate(filtro);
  //$("#alert").attr("class", "alert alert-warning hidden");
  $("#tableres").bootstrapTable({
    data: filtro,
  });
  $("#tableres").bootstrapTable("load", filtro);
 
await revisitas(resp).then( (result) => {
console.log(result);
});




  /*} else {
                  $("#tablereservas").attr("class", "table-responsive hidden");
                  $("#alert").attr("class", "alert alert-warning show");
              };*/
  reservasCount = jsonata("$count($)").evaluate(filtro);
  $("#tablereservas").removeClass("hidden");
  if (reservasCount == 1) {
    $("#hReservas").text("Hay una reserva hecha bajo tu responsabilidad");
    //   $("#reservasCount").attr("class", "badge show");
  } else if (reservasCount > 1) {
    $("#hReservas").text("Hay "+ reservasCount+" reservas hechas bajo tu responsabilidad");
    //  $("#reservasCount").attr("class", "badge hidden");
  } else {
    $("#tablereservas").addClass("hidden");
  };
if (reservasCount <limiteReservasRespMin) {
  $("#pnlReservas").removeClass("hidden");
  $("#pnlWarningResp").addClass("hidden");
  $("#pnlInvalidResp").addClass("hidden");

} else if (reservasCount >=limiteReservasRespMin && reservasCount <limiteReservasRespMax) {
  $("#pnlReservas").removeClass("hidden");
  $("#pnlWarningResp").removeClass("hidden");
  $("#pnlInvalidResp").addClass("hidden");
  $("#spWarningRespReservas").text(limiteReservasRespMax);
  $("#spWarningRespDías").text(tiempoMaxReservasResp);
} else if  (reservasCount >=limiteReservasRespMax) {
  $("#pnlReservas").addClass("hidden");
  $("#pnlWarningResp").addClass("hidden");
  $("#pnlInvalidResp").removeClass("hidden");
};
var maxDays = jsonata("$max(Days)").evaluate(filtro);
if (maxDays >= tiempoMaxReservasResp){
  $("#pnlReservas").addClass("hidden");
  $("#pnlWarningResp").addClass("hidden");
  $("#pnlInvalidResp").removeClass("hidden");

};

  $("#cargando").modal("hide");
}

function LinkFormatter(value, row, index) {
    //return "<a  class='btn btn-primary' role='button' href='javascript:win = window.open(&apos;informar.html?telefono=" + value + "&apos;);'><strong>" + value + "</strong></a>"
    return "<button type='button' id='btnInformar" + value + "' data-informar='"+ value + "' class='btn btn-primary' tel='" + value + "'>" + value + "</button>";
    
}



$(document).ready(function () {
  $("#spResponsable").text(resp);
  $("#contactos").click(function () {
    $("#tablereservas").attr("class", "hidden");
    $("#pnlContactos").attr("class", "panel panel-primary ");
    $("#contactos").attr("class", "active");
    $("#reservas").attr("class", "");
    tipo = "contactos";
  });
  $("#reservas").click(function () {
    $("#tablereservas").attr("class", "show");
    $("#pnlContactos").attr("class", "panel panel-primary hidden");
    $("#reservas").attr("class", "active");
    $("#contactos").attr("class", "");
    tipo = "reservas";
    loadJson();
  });
  if (resp === undefined) {
    loadJson();
    loadResp();
    $("#modResponsable").modal("show");
  } else {
    $("#spResponsable").text(resp);
    $("#selResponsable").val(resp);
  }
  $("#btnResponsable").click(function () {
    if ($("#formresp")[0].checkValidity()) {
      resp = $("#selResponsable").find(":selected").text();
      Cookies.set("responsable", resp);
      $("#spResponsable").text(resp);
      $("#modResponsable").modal("hide");
      filterJson();
    } else {
      $("#formresp").find("#submit-hiddenResp").click();
    }
  });

  if (zona != undefined) {

    $("#selZona").val(zona);
  };

  $("#selZona,#Publicador").change(function () {
    if ( $("#selZona").val() != "" && $("#Publicador").val() != "") {
        $("#btnSelect").attr("disabled", false);
    } else {$("#btnSelect").attr("disabled", true);};
    zona=$("#selZona").val();
  });

  $("#btnRefresh").click(function () {
    loadJson(true);
    
  });

  $(document).on('click', 'button[data-informar]', function(){ 
          $("#modInformar").modal("show");
var selTel =  $(this).attr("data-informar");
//$('#cargando').modal('show');

  //var data = jsonata('$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7]})').evaluate(jsonurl);
  informarContacto = jsonata('$[Telefono="' + selTel + '"]').evaluate(data);
  console.log(registrotel);
  $("#informarTelefono").val(informarContacto['Telefono']);
  $("#pInfomarTelefono").text(informarContacto['Telefono']);
  $("#pInfomarPublicador").text(informarContacto['Publicador']);
  $("#pInformarResponsable").text(resp);
  $("#informarResponsable").val(resp);
  $("#informarDireccion").val(informarContacto['Direccion']);
  $("#pInformarDireccion").text(informarContacto['Direccion']);
  $("#informarLocalidad").val(informarContacto['Localidad']);
  $("#pInformarLocalidad").text(informarContacto['Localidad']);
      selpub = informarContacto['Publicador'];
      var fechaHoy = jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate();
    
        fechaMDY = jsonata('$fromMillis($toMillis($.Fecha,"[D]/[M]/[Y]"),"[Y0001]-[M01]-[D01]")').evaluate(registrotel);
      $("#ddInformarFecha").attr("min", fechaMDY);
      $("#ddInformarFecha").attr("max", fechaHoy);
      $("#ddInformarFecha").val(fechaHoy);
      $("#ddInformarEstado").val("");
      $("#fgInformarFecha,#fgInformarTurno,#fgInformarPublicador,#fgInformarObservaciones").addClass("hidden");
      $("#btnInformarEnviar").attr("disabled", true); 
      console.log(fechaMDY);
      $('#cargando').modal('hide');
 

});
 // $("button[name|='btnInformar']").click(function () {
 //   $("#modInformar").modal("show");
 // });

  $("#btnCloseSuccess").click(function () {
    loadJson(true);
    $("#modSuccess").modal("hide");
  });
  $("#btnInformarCloseSuccess").click(function () {
    loadJson(true);
    $("#modInformarSuccess").modal("hide");
  });
  $("#nomResponsable").click(async function () {
    await loadResp();
    $("#modResponsable").modal("show");
    $("#selResponsable").val(resp);
  });

  $("#btnSelect").click(function () {
    if ($("#formres")[0].checkValidity()) {
      preSelect();
    } else {
      $("#formres").find("#submit-hidden").click();
    }
  });

  $("#btnReenviarwa").click(function () {
    getWAlink();
  });

  $("#cbWarningMore").change(function () {
    if (this.checked) {
    $("#divWarningAdv").removeClass("hidden");
    $("#spWarningTimeout").text(timeoutReservas);}
    else {$("#divWarningAdv").addClass("hidden");}
  });

  $("#cbWarningAdv").change(function () {
    if (this.checked) {
      var counter = timeoutReservas;

      interval = setInterval(function () {
        counter--;
        $("#spBtnWarningTimeout").text("(" + counter + ")");
        // Display 'counter' wherever you want to display it.
        if (counter == 0) {
          // Display a login box
          $("#btnWarningEnviar").prop("disabled", false);
          $("#spBtnWarningTimeout").text("");
          clearInterval(interval);
        }
      }, 1000);
    } else {
      $("#btnWarningEnviar").prop("disabled", true);
    }
  });

  function preSelect() {

    selectedPub = jsonata("$[Nombre='" + $("#Publicador").val() + "']").evaluate(pubs);
    reservasPub=jsonata("[$[Publicador='" + $("#Publicador").val() + "']]").evaluate(data);
    maxminReservasPub=jsonata('$[Publicador="'+  $("#Publicador").val() +'"]{"LastMillis":$max(Timestamp),"LastIso":$fromMillis($max(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"FirstMillis":$min(Timestamp),"FirstIso":$fromMillis($min(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"Count":$count($),"FirstDays":$floor(($toMillis($now(undefined,"-0300"))-$min(Timestamp))/8.64e+7),"LastMins":$round(($toMillis($now(undefined,"-0300"))-$max(Timestamp))/60000,1)}').evaluate(data);
    var firstDays = maxminReservasPub["FirstDays"];
    var numReservas = selectedPub["Reservas"];
    txtReservas=jsonata('$[Publicador="'+ $("#Publicador").val() + '"].("*"&Telefono&"* el "&TimestampIso&", responsable: *"&Responsable&"*")~> $join("\n")').evaluate(data);
    if (numReservas < limiteReservasMin) {
      $("#spConfirmPub").text(selectedPub["Nombre"]);
      $("#spConfirmResp").text(resp);
      $("#modConfirm").modal("show");
      txtReservas = "";
    } else if (
      numReservas >= limiteReservasMin &&
      numReservas < limiteReservasMax
    ) {
        $("#cbWarningAdv").prop("checked", false);
        $("#cbWarningMore").prop("checked", false);
        $("#btnWarningEnviar").prop("disabled", true);
        clearInterval(interval);
        $("#divWarningAdv").addClass("hidden");
        $("#spBtnWarningTimeout").text("");
        $("#tableWarning").bootstrapTable({
            data: reservasPub,
          });
          $("#tableWarning").bootstrapTable("load", reservasPub);
      $("#modWarning").modal("show");
      txtReservas = "\n\n*ATENCIÓN*\nHay *"+ numReservas+" números reservados a tu nombre que aún no han sido informados.*\n" + txtReservas +"\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó. Si se exceden las "+ limiteReservasMax +" reservas o pasan "+ tiempoMaxReservas +" días ya no será posible enviarte más números. Gracias.";

    } else if (
        firstDays > tiempoMaxReservas
        ) {
            $("#modInvalid").modal("show");
            $("#pInvalid").text("El publicador tiene reservas sin informar por más de " + tiempoMaxReservas + " días.");
            txtReservas = "*ATENCIÓN*\n\nHay *"+ numReservas+" números reservados a tu nombre que aún no han sido informados.* Como se ha excedido la cantidad de días para informarlas, *no es posible asginarte más números.*\n" + txtReservas +"\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
            $("#tableInvalid").bootstrapTable({
              data: reservasPub,
            });
            $("#tableInvalid").bootstrapTable("load", reservasPub);

        } else if (
        numReservas >= limiteReservasMax 
        ) {
      $("#modInvalid").modal("show");
      $("#pInvalid").text("El publicador excedió el límite de " + limiteReservasMax + " reservas.");
      txtReservas = "*ATENCIÓN*\n\nHay *"+ numReservas+" números reservados a tu nombre que aún no han sido informados.* Como se ha excedido el número de reservas, *no es posible asginarte más números.*\n" + txtReservas +"\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
      $("#tableInvalid").bootstrapTable({
        data: reservasPub,
      });
      $("#tableInvalid").bootstrapTable("load", reservasPub);
    };
  };


  function getWAlink() {
    var selpub = $("#Publicador").val();
    var selpubtel = jsonata('$[Nombre="' + selpub + '"].Tel').evaluate(pubs);
    if (selpubtel) {
      linkwa = "https://wa.me/+54" + selpubtel;
    } else {
      linkwa = "https://wa.me/";
    }
    //
    linkwa =
      linkwa +
      "?text=" +
      encodeURIComponent(
        "_Co. Churruarín_ \r\n*ASIGNACIÓN DE TERRITORIO TELEFÓNICO*"+txtReservas+"\n\nSe te asignó el siguiente número telefónico para que lo atiendas: \nNúmero: *" +
          registrotelpretty["Telefono"] +
          "*\nDirección: *" +
          registrotelpretty["Direccion"] +
          "*\nFue llamado la última vez: *" +
          registrotelpretty["Fecha"] +
          "*\nRespuesta a la última llamada: *" +
          registrotelpretty["Respuesta"] +
          "*\n\nPor favor, *no olvides informar* la respuesta del amo de casa al hermano que te asignó este número. Llevar un buen registro es esencial para dar un buen testimonio. \nPor favor, incluí en tu respuesta estos datos: \n*Teléfono:* \n*Respuesta* (Opciones: atendió / no atendió / no existente / no volver a llamar / mensaje en el contestador / revisita): \n*Fecha de la llamada:* \n*Turno de la llamada* (mañana o tarde): \n*Observaciones* (opcional): \nSi deseás reservar el número como *revisita*, por favor no olvides informarle al hermano cuando ya no lo sigas revisitando. Gracias."
      );
  }

  $("#btnEnviar,#btnWarningEnviar").click(async function () {
    $("#modConfirm").modal("hide");
    $("#modWarning").modal("hide");
    $("#cargando").modal("show");
    await loadContacto();
    if (await submitForm()) {
      getWAlink();
      window.open(linkwa);
      //window.opener.postMessage('close', 'https://churruar.in');
      $("#modSuccess").modal("show");
    } else {
      alert("Ocurrió un error. Intentá enviarlo de nuevo.");
    }
    $("#cargando").modal("hide");
  });

  $("#btnEnviarInvalid").click(async function () {
    $("#modConfirm").modal("hide");
    $("#modWarning").modal("hide");
    $("#cargando").modal("show");
    var selpub = $("#Publicador").val();
    var selpubtel = jsonata('$[Nombre="' + selpub + '"].Tel').evaluate(pubs);
    if (selpubtel) {
      linkwa = "https://wa.me/+54" + selpubtel;
    } else {
      linkwa = "https://wa.me/";
    }
    linkwa =
      linkwa +
      "?text=" +
      encodeURIComponent(txtReservas);
      window.open(linkwa);
      //window.opener.postMessage('close', 'https://churruar.in');
      $("#modInvalid").modal("hide");
    
    $("#cargando").modal("hide");
  });

  $("#ddInformarEstado").change(function() {
    $("#ddInformarPublicador,#txtInformarObservaciones,#ddInformarTurno").val("");
    switch( $("#ddInformarEstado").val()) {
      case "Atendió":
      case "No atiende":
      case "Mensaje en contestador":
      case "No volver a llamar":
        $("#fgInformarFecha,#fgInformarTurno").removeClass("hidden");
        $("#ddInformarFecha,#ddInformarTurno").attr("required", true);
        $("#fgInformarPublicador,#fgInformarObservaciones").addClass("hidden");
        $("#ddInformarPublicador,#txtInformarObservaciones").attr("required", false);
        $("#btnInformarEnviar").attr("disabled", false); 
        
        break;
      case "No existente":
      case "Revisita":
        $("#fgInformarFecha").removeClass("hidden");
        $("#ddInformarFecha").attr("required", true);
        $("#fgInformarPublicador,#fgInformarObservaciones,#fgInformarTurno").addClass("hidden");
        $("#ddInformarPublicador,#txtInformarObservaciones,#ddInformarTurno").attr("required", false);
        $("#btnInformarEnviar").attr("disabled", false); 
        break;

      default:

        $("#fgInformarFecha,#fgInformarTurno,#fgInformarPublicador,#fgInformarObservaciones").addClass("hidden");
        $("#btnInformarEnviar").attr("disabled", true); 
        
    }
  });


  $("#btnInformarEnviar").click(async function() {
    if($('#formInformar')[0].checkValidity()) {
            $('#cargando').modal('show');
            $("#modInformar").modal("hide");
      if (await submitInformarForm()) {
        // window.open(linkwa);
        $("#modInformarSuccess").modal("show");
        
                //console.log("ok");
      } else {
                alert("Ocurrió un error. Intentá enviarlo de nuevo.");
              };
            
            $('#cargando').modal('hide');
            
    } else {
      $("#formres").find("#submit-hidden").click();
    };
  });

	async function submitInformarForm() {
    var dataJson = {
     
      Telefono: informarContacto["Telefono"],
      Localidad: informarContacto["Localidad"],
      Direccion: informarContacto["Direccion"],
      Fecha: $("#ddInformarFecha").val(),
      Turno: $("#ddInformarTurno").val(),
      Estado: $("#ddInformarEstado").val(),
      Publicador: informarContacto["Publicador"],
      Responsable: resp,
      Observaciones: $("#txtInformarObservaciones").val(),

    };
    data = new FormData();
    Object.keys(dataJson).forEach(key => data.append(key, dataJson[key]));
    //data.append(JSON.stringify(dataJson));
     var respuesta = false;
     var response = await fetch(scriptURL, {
       method: "POST",
       body: data,
     }).catch((error) => {
       respuesta = false;
     });
     console.log(data);
     respuesta = response.ok;
     console.log(respuesta);
     console.log(response);
  return respuesta;
};

  async function submitForm() {
   // await loadContacto();
    var dataJson = {
      Publicador: selectedPub["Nombre"],
      Telefono: registrotel["Telefono"],
      Localidad: registrotel["Localidad"],
      Direccion: registrotel["Direccion"],
      Fecha: jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate(),
      Estado: "Reservado",
      Responsable: resp,
      Observaciones: ""
    };
   // data = new FormData($("#formres")[0]); 
   data = new FormData();
   Object.keys(dataJson).forEach(key => data.append(key, dataJson[key]));
   //data.append(JSON.stringify(dataJson));
    var respuesta = false;
    var response = await fetch(scriptURL, {
      method: "POST",
      body: data,
    }).catch((error) => {
      respuesta = false;
    });
    console.log(data);
    respuesta = response.ok;
    console.log(respuesta);
    console.log(response);

    return respuesta;
  };
  loadJson(true);
});
