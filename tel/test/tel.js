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
  rLocalidad,
  selectedPub;
var rpTelefono, rpDireccion, rpFecha, rpRespuesta;
var registrotel;
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
var jsonRevisitas, jsonPublicadores, jsonResponsables, jsonContactos;
const settings = {
  limiteReservasMin: 1, //minimo de reservas sin restricciones
  limiteReservasMax: 15, //máximo de reservas antes de bloquear
  timeoutReservas: 5, //segundos de espera para hacer una reserva adicional
  tiempoMinReservas: 2.5, //minutos minimos entre reservas
  tiempoMaxReservas: 60, //dias desde la reserva mas antigua para bloquear un pub
  limiteReservasRespMin: 10, //minimo de reservas sin restricciones
  limiteReservasRespMax: 20, //máximo de reservas antes de bloquear
  tiempoMaxReservasResp: 60, //dias desde la reserva mas antigua para bloquear un resp
};
const urls = {
  revisitas:
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/revisitas?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc",
  contactos:
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/telefonos2?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc",
  publicadores:
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/pubs?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc",
  responsables:
    "https://sheets.googleapis.com/v4/spreadsheets/1VGOPLJ19ms7Xi1NyLFE83cjAkq3OrffrwRjjxgcgSQ4/values/responsables?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc",
  script:
    "https://script.google.com/macros/s/AKfycbzivt4eVHnlJKOwMIHFq6n200v8eMOkx8qNJOgFf08R-ncjqa_r/exec",
};
var selectedRecord = {
  publicador: {
    publicador: {},
    revisita: {},
    reserva: {},
    revisitas: {},
    reservas: {},
  },
  responsable: {
    responsable: Cookies.get("responsable"),
    reservas: {},
    revisitas: {},
  },
  territorio: Cookies.get("zona"),
};
var allRecords = {
  publicadores: {},
  responsables: {},
  contactos: {},
  revisitas: {},
};

async function responsables(tipo, nombre, refresh) {
  if (
    refresh === true ||
    jQuery.isEmptyObject(allRecords.responsables) === true
  )
    await $.getJSON(urls.responsables).done(function (jsonurl) {
      allRecords.responsables = jsonata('$.values.({"Nombre":$[0]})').evaluate(
        jsonurl
      );
    });
  return allRecords.responsables;
}

async function publicadores(tipo, nombre, refresh) {
  if (
    refresh === true ||
    jQuery.isEmptyObject(allRecords.publicadores) === true
  )
    await $.getJSON(urls.publicadores).done(function (jsonurl) {
      allRecords.publicadores = jsonata(
        '$.values.({"Nombre":$[0],"Grupo":$[1],"Tel":$[2],"Reservas":$number($[3])})'
      ).evaluate(jsonurl);
    });
  if (typeof nombre !== "undefined") {
    var jsonPubs = jsonata('$[Nombre="' + nombre + '"]').evaluate(
      allRecords.publicadores
    );

    return jsonPubs;
  }
  return allRecords.publicadores;
}

async function revisitas(tipo, nombre, refresh) {
  if (refresh === true || jQuery.isEmptyObject(allRecords.revisitas) === true)
    await $.getJSON(urls.revisitas).done(function (jsonurl) {
      allRecords.revisitas = jsonata(
        '$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8], "Timestamp":$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]")})'
      ).evaluate(jsonurl);
    });
  revi = allRecords.revisitas;
  switch (tipo) {
    case "responsable":
      revi = jsonata('[$[Responsable="' + nombre + '"]]').evaluate(
        allRecords.revisitas
      );
      break;
    case "publicador":
      revi = jsonata('[$[Publicador="' + nombre + '"]]').evaluate(
        allRecords.revisitas
      );
      break;
    case "revisita":
      revi = jsonata('[$[Telefono="' + nombre + '"]]').evaluate(
        allRecords.revisitas
      );

      break;
  }

  return revi;
}

async function contactos(tipo, nombre, refresh) {
  if (refresh === true || jQuery.isEmptyObject(allRecords.contactos) === true)
    await $.getJSON(urls.contactos).done(function (jsonurl) {
      allRecords.contactos = jsonata(
        '$map($.values.({"Telefono":$[0], "Direccion":($[2]="Campaña celulares 2021"? ($eval($[1])) :$[1]), "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8],' +
          '"Timestamp":$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"),' +
          '"DireccionP":($[2]="Campaña celulares 2021"? () : $[1] & ", " & $[2]),"PublicadorFecha":$[5] &" ("& $[3] &")" , "FechaP": ($[3] & ($boolean($[6]) ?(" por la "& $[6]) : ""))}), function($v){' +
          '$v.Localidad="Campaña celulares 2021"?$merge([$v,{"DireccionP":$map($v.Direccion.[$number($.numdesde)..$number($.numhasta)], function($val){$v.Direccion.area & "-" & $v.Direccion.pre & "-" & $pad($string($val),-4,"0") })}]):$v})'
      ).evaluate(jsonurl);
    });
  var contactos;
  switch (tipo) {
    case "asignar":
      if (typeof nombre === "undefined") {
        localidad = '[Localidad!="Campaña celulares 2021"]';
      } else {
        localidad = '[Localidad="' + nombre + '"]';
      }
      contactos = jsonata(
        '$shuffle($[Respuesta!="Reservado"]' + localidad + ")[0]"
      ).evaluate(allRecords.contactos);

      break;
    case "reservasPublicador":
      contactos = jsonata(
        '[$[Respuesta="Reservado"][Publicador="' + nombre + '"]]'
      ).evaluate(allRecords.contactos);
      selectedRecord.publicador.reservas = contactos;
      selectedRecord.publicador.reservasStats = jsonata('{"LastMillis":$max(Timestamp),"LastIso":$fromMillis($max(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"FirstMillis":$min(Timestamp),"FirstIso":$fromMillis($min(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"Count":$count($),"FirstDays":$floor(($toMillis($now(undefined,"-0300"))-$min(Timestamp))/8.64e+7),"LastMins":$round(($toMillis($now(undefined,"-0300"))-$max(Timestamp))/60000,1)}').evaluate(contactos);
      break;

    case "reservasResponsable":
      contactos = jsonata(
        '[$[Respuesta="Reservado"][Responsable="' + nombre + '"]]'
      ).evaluate(allRecords.contactos);
      //selectedRecord.responsable.reservas = contactos;
      break;
    case "reserva":
      contactos = jsonata(
        '[$[Respuesta="Reservado"][Telefono="' + nombre + '"]]'
      ).evaluate(allRecords.contactos);

      break;
    default:
      contactos = allRecords.contactos;
  }
  return contactos;
}

async function submit(dataJson) {
  data = new FormData();
  Object.keys(dataJson).forEach((key) => data.append(key, dataJson[key]));
  //data.append(JSON.stringify(dataJson));
  var respuesta = false;
  var response = await fetch(urls.script, {
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
}

async function waLink(publicador, contacto, tipo) {
 // var selpubtel = await publicadores(undefined, publicador);

  selpubtel = selectedRecord.publicador.publicador.Tel;

  var link;
  if (selpubtel) {
    link = "https://wa.me/+54" + selpubtel;
  } else {
    link = "https://wa.me/";
  }
  //
  link =
    link +
    "?text=" +
    encodeURIComponent(
      "_Co. Churruarín_ \r\n*ASIGNACIÓN DE TERRITORIO TELEFÓNICO*" +
      selectedRecord.publicador.txtReservas +
        "\n\nSe te asignó el siguiente número telefónico para que lo atiendas: \nNúmero: *" +
        contacto.Telefono +
        "*\nDirección: *" +
        contacto.DireccionP +
        "*\nFue llamado la última vez: *" +
        contacto.FechaP +
        "*\nRespuesta a la última llamada: *" +
        contacto.Respuesta +
        "*\n\nPor favor, *no olvides informar* la respuesta del amo de casa al hermano que te asignó este número. Llevar un buen registro es esencial para dar un buen testimonio. \nPor favor, incluí en tu respuesta estos datos: \n*Teléfono:* \n*Respuesta* (Opciones: atendió / no atendió / no existente / no volver a llamar / mensaje en el contestador / revisita): \n*Fecha de la llamada:* \n*Turno de la llamada* (mañana o tarde): \n*Observaciones* (opcional): \nSi deseás reservar el número como *revisita*, por favor no olvides informarle al hermano cuando ya no lo sigas revisitando. Gracias."
    );
  return link;
}

async function selectRecord(tipo, nombre, refresh) {
  switch (tipo) {
    case "reserva":
      selectedRecord.publicador.reserva = await contactos(
        "reserva",
        nombre,
        refresh
      );
      selectedRecord.publicador.reservas = await contactos(
        "reservas",
        selectedRecord.publicador.reserva[0].Publicador
      );
      selectedRecord.publicador.publicador = await publicadores(
        "publicador",
        selectedRecord.publicador.reserva[0].Publicador,
        refresh
      );
      return selectedRecord;
      break;
    case "revisita":
      selectedRecord.publicador.revisita = await revisitas(
        "revisita",
        nombre,
        refresh
      );
      selectedRecord.publicador.revisitas = await revisitas(
        "revisitas",
        selectedRecord.publicador.revisita[0].Publicador
      );
      selectedRecord.publicador.publicador = await publicadores(
        "publicador",
        selectedRecord.publicador.revisita[0].Publicador
      );
      return selectedRecord;
      break;
    case "asignar":
      selectedRecord.publicador.reserva = await contactos(
        "asignar",
        nombre,
        true
        
      );

return selectedRecord.publicador.reserva;


      break;
    case "reservasResponsable":
      selectedRecord.responsable.reservas = await contactos(
        "reservasResponsable",
        selectedRecord.responsable.responsable,
        refresh
      );
      $("#tableres").bootstrapTable({
        data: selectedRecord.responsable.reservas,
      });
      $("#tableres").bootstrapTable(
        "load",
        selectedRecord.responsable.reservas
      );
      break;
      case "reservasPublicador":
        selectedRecord.publicador.reservas = await contactos(
          "reservasPublicador",
          nombre,
          refresh
        );
        await selectRecord("publicador",nombre);

        break;
        case "publicador":
          selectedRecord.publicador.publicador = await publicadores(
            "publicador",
            nombre,
            refresh
          );
  
          break;        
    case "revisitasResponsable":
      selectedRecord.responsable.revisitas = await revisitas(
        "responsable",
        selectedRecord.responsable.responsable,
        refresh
      );
      $("#tableRevisitas").bootstrapTable({
        data: selectedRecord.responsable.revisitas,
      });
      $("#tableRevisitas").bootstrapTable(
        "load",
        selectedRecord.responsable.revisitas
      );
      break;
    case "publicadores":
      var pubs = await publicadores(undefined, undefined, refresh);
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
      break;
    case "territorios":
      var territorios = jsonata("$distinct($.Localidad)").evaluate(
        await contactos(undefined, undefined, refresh)
      );
      var listterritorios = "<option>Indistinto</option>";
      $.each(territorios, function (i) {
        listterritorios += "<option>" + territorios[i] + "</option>";
      });
      $("#selZona").empty();
      $("#selZona").append(listterritorios);
      break;
    default:
      selectRecord("reservasResponsable", undefined, true);
      selectRecord("revisitasResponsable", undefined, true);
      selectRecord("publicadores", undefined, true);
      responsables(undefined, undefined, true);
      selectRecord("territorios");
      break;
  }
}

function LinkFormatter(value, row, index) {
  return (
    "<button type='button' id='btnInformar" +
    value +
    "' data-informar='" +
    value +
    "' class='btn btn-primary' tel='" +
    value +
    "'>" +
    value +
    "</button>"
  );
};
function LinkFormatterRevisita(value, row, index) {
  return (
    "<button type='button' id='btnRevisita" +
    value +
    "' data-revisita='" +
    value +
    "' class='btn btn-primary' tel='" +
    value +
    "'>" +
    value +
    "</button>"
  );
};

async function reservaPrecheck(publicador) {
  $("#cargando").modal("show");
  await selectRecord("reservasPublicador",publicador,true);
  $("#cargando").modal("hide");
var reservas = selectedRecord.publicador.reservas;
  var stats = selectedRecord.publicador.reservasStats;

  var numReservas = reservas.length;
  var txtReservas = jsonata(
    '$.("*"&Telefono&"* el "&TimestampIso&", responsable: *"&Responsable&"*")~> $join("\n")'
  ).evaluate(reservas);
  if (numReservas < settings.limiteReservasMin) {
    $("#spConfirmPub").text(selectedPub["Nombre"]);
    $("#spConfirmResp").text(resp);
    $("#modConfirm").modal("show");
    txtReservas = "";
  } else if (
    numReservas >= settings.limiteReservasMin &&
    numReservas < settings.limiteReservasMax
  ) {
    $("#cbWarningAdv").prop("checked", false);
    $("#cbWarningMore").prop("checked", false);
    $("#btnWarningEnviar").prop("disabled", true);
    clearInterval(interval);
    $("#divWarningAdv").addClass("hidden");
    $("#spBtnWarningTimeout").text("");
    $("#tableWarning").bootstrapTable({
      data: reservas,
    });
    $("#tableWarning").bootstrapTable("load", reservas);
    $("#modWarning").modal("show");
    txtReservas =
      "\n\n*ATENCIÓN*\nHay *" +
      numReservas +
      " números reservados a tu nombre que aún no han sido informados.*\n" +
      txtReservas +
      "\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó. Si se exceden las " +
      settings.limiteReservasMax +
      " reservas o pasan " +
      settings.tiempoMaxReservas +
      " días ya no será posible enviarte más números. Gracias.";
  } else if (stats.firstDays > settings.tiempoMaxReservas) {
    $("#modInvalid").modal("show");
    $("#pInvalid").text(
      "El publicador tiene reservas sin informar por más de " +
      settings.tiempoMaxReservas +
        " días."
    );
    txtReservas =
      "*ATENCIÓN*\n\nHay *" +
      numReservas +
      " números reservados a tu nombre que aún no han sido informados.* Como se ha excedido la cantidad de días para informarlas, *no es posible asginarte más números.*\n" +
      txtReservas +
      "\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
    $("#tableInvalid").bootstrapTable({
      data: reservas,
    });
    $("#tableInvalid").bootstrapTable("load", reservas);
  } else if (numReservas >= settings.limiteReservasMax) {
    $("#modInvalid").modal("show");
    $("#pInvalid").text(
      "El publicador excedió el límite de " + settings.limiteReservasMax + " reservas."
    );
    txtReservas =
      "*ATENCIÓN*\n\nHay *" +
      numReservas +
      " números reservados a tu nombre que aún no han sido informados.* Como se ha excedido el número de reservas, *no es posible asginarte más números.*\n" +
      txtReservas +
      "\nPor favor, enviá cuanto antes el informe de estos numeros al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
    $("#tableInvalid").bootstrapTable({
      data: reservas,
    });
    $("#tableInvalid").bootstrapTable("load", reservas);
  }
  selectedRecord.publicador.txtReservas = txtReservas;

  return txtReservas
}


async function loadContacto() {
  $("#cargando").modal("show");
  var localidad;
  if ($("#selZona").val() != "Indistinto") {
    localidad = $("#selZona").val();
  }
  registrotel = await contactos("asignar", localidad, true);
  rpTelefono = registrotel["Telefono"];
  rpDireccion = registrotel["DireccionP"];
  rpFecha = registrotel["FechaP"];
  rpRespuesta = registrotel["Respuesta"];
  $("#ddResponsable").text(resp);
  $("#Responsable").val(resp);
  $("#ddObservaciones").text(registrotel["Observaciones"]);
  $("#Telefono").val(registrotel["Telefono"]);
  $("#Direccion").val(registrotel["Direccion"]);
  $("#Localidad").val(registrotel["Localidad"]);
  $("#Estado").val("Reservado");
  rTelefono = registrotel["Telefono"];
  rDireccion = registrotel["Direccion"];
  rFecha = jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate();
  rEstado = "Reservado";
  rResponsable = resp;
  rObservaciones = "";
  rLocalidad = registrotel["Localidad"];
  $("#spPub").text(resp);
  $("#spTel").text(registrotel["Telefono"]);

  $("#Fecha").val(jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate());
  console.log(registrotel);
  //console.log(jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate());
  return registrotel;
}

async function loadResp() {
  $("#cargando").modal("show");
  var vresponsables = await responsables();
  var listitems = "";
  $("#selResponsable").empty();
  $.each(vresponsables, function (key, value) {
    listitems += "<option>" + value["Nombre"] + "</option>";
  });
  $("#selResponsable").append(listitems);
  $("#selResponsable").val(resp);

  $("#cargando").modal("hide");
}

async function filterJson(background) {
  if (background != true) {
    $("#cargando").modal("show");
  }
  var filtro = await contactos("reservasResponsable", resp);

  $("#tableres").bootstrapTable({
    data: filtro,
  });
  $("#tableres").bootstrapTable("load", filtro);

  var revi = await revisitas("responsable", resp, true);
  console.log(revi);
  $("#tableRevisitas").bootstrapTable({
    data: revi,
  });
  $("#tableRevisitas").bootstrapTable("load", revi);

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
    $("#hReservas").text(
      "Hay " + reservasCount + " reservas hechas bajo tu responsabilidad"
    );
    //  $("#reservasCount").attr("class", "badge hidden");
  } else {
    $("#tablereservas").addClass("hidden");
  }
  if (reservasCount < limiteReservasRespMin) {
    $("#pnlReservas").removeClass("hidden");
    $("#pnlWarningResp").addClass("hidden");
    $("#pnlInvalidResp").addClass("hidden");
  } else if (
    reservasCount >= limiteReservasRespMin &&
    reservasCount < limiteReservasRespMax
  ) {
    $("#pnlReservas").removeClass("hidden");
    $("#pnlWarningResp").removeClass("hidden");
    $("#pnlInvalidResp").addClass("hidden");
    $("#spWarningRespReservas").text(limiteReservasRespMax);
    $("#spWarningRespDías").text(tiempoMaxReservasResp);
  } else if (reservasCount >= limiteReservasRespMax) {
    $("#pnlReservas").addClass("hidden");
    $("#pnlWarningResp").addClass("hidden");
    $("#pnlInvalidResp").removeClass("hidden");
  }
  var maxDays = jsonata("$max(Days)").evaluate(filtro);
  if (maxDays >= tiempoMaxReservasResp) {
    $("#pnlReservas").addClass("hidden");
    $("#pnlWarningResp").addClass("hidden");
    $("#pnlInvalidResp").removeClass("hidden");
  }

  $("#cargando").modal("hide");
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
  }

  $("#selZona,#Publicador").change(function () {
    if ($("#selZona").val() != "" && $("#Publicador").val() != "") {
      $("#btnSelect").attr("disabled", false);
    } else {
      $("#btnSelect").attr("disabled", true);
    }
    zona = $("#selZona").val();
  });

  $("#btnRefresh").click(function () {
    loadJson(true);
  });

  // $("button[name|='btnInformar']").click(function () {
  //   $("#modInformar").modal("show");
  // });

  $("#btnCloseSuccess").click(function () {
    loadJson(true);
    $("#modSuccess").modal("hide");
  });

  $("#nomResponsable").click(async function () {
    await loadResp();
    $("#modResponsable").modal("show");
    $("#selResponsable").val(resp);
  });

  $("#btnSelect").click(async function () {
    if ($("#formres")[0].checkValidity()) {
      await reservaPrecheck( $("#Publicador").val());
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
      $("#spWarningTimeout").text(timeoutReservas);
    } else {
      $("#divWarningAdv").addClass("hidden");
    }
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

  
  $("#btnEnviar,#btnWarningEnviar").click(async function () {
    $("#modConfirm").modal("hide");
    $("#modWarning").modal("hide");
    $("#cargando").modal("show");
    var localidad = ($("#selZona").val() != "Indistinto")? $("#selZona").val():undefined;
    var contacto = await selectRecord("asignar", localidad, true);
    var dataJson = {
      Publicador: selectedRecord.publicador.publicador.Nombre,
      Telefono: contacto.Telefono,
      Localidad: contacto.Localidad,
      Direccion: contacto.Direccion,
      Fecha: jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate(),
      Estado: "Reservado",
      Responsable: selectedRecord.responsable.responsable,
      Observaciones: "",
    };
    if (await submit(dataJson)) {
      // var link = await waLink(selectedPub["Nombre"],contacto);
      window.open(await waLink(selectedRecord.publicador.publicador.Nombre, contacto));
      //window.opener.postMessage('close', 'https://churruar.in');
      $("#spSuccessPublicador").text(selectedRecord.publicador.publicador.Nombre);
      $("#spSuccessTelefono").text(selectedRecord.publicador.reserva.Telefono);
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
    linkwa = linkwa + "?text=" + encodeURIComponent(txtReservas);
    window.open(linkwa);
    //window.opener.postMessage('close', 'https://churruar.in');
    $("#modInvalid").modal("hide");

    $("#cargando").modal("hide");
  });

  //-----INFORMAR RESERVA-----
  $(document).on("click", "button[data-informar]", async function () {
    $("#modInformar").modal("show");
    await selectRecord("reserva", $(this).attr("data-informar"), true);
    //$('#cargando').modal('show');
    var reserva = selectedRecord.publicador.reserva[0];
    //var data = jsonata('$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7]})').evaluate(jsonurl);

    $("#pInfomarTelefono").text(reserva.Telefono);
    $("#pInfomarPublicador").text(reserva.Publicador);
    $("#pInformarResponsable").text(selectedRecord.responsable.responsable);
    $("#pInformarDireccion").text(reserva.Direccion);
    $("#pInformarLocalidad").text(reserva.Localidad);
    //selpub = informarContacto["Publicador"];
    var fechaHoy = jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate();

    fechaMDY = jsonata(
      '$fromMillis($toMillis($.Fecha,"[D]/[M]/[Y]"),"[Y0001]-[M01]-[D01]")'
    ).evaluate(reserva);
    $("#ddInformarFecha").attr("min", fechaMDY);
    $("#ddInformarFecha").attr("max", fechaHoy);
    $("#ddInformarFecha").val(fechaHoy);
    $("#ddInformarEstado").val("");
    $(
      "#fgInformarFecha,#fgInformarTurno,#fgInformarPublicador,#fgInformarObservaciones"
    ).addClass("hidden");
    $("#btnInformarEnviar").attr("disabled", true);
    console.log(fechaMDY);
    $("#cargando").modal("hide");
  });
  $("#ddInformarEstado").change(function () {
    $("#ddInformarPublicador,#txtInformarObservaciones,#ddInformarTurno").val(
      ""
    );

    switch ($("#ddInformarEstado").val()) {
      case "Atendió":
      case "No atiende":
      case "Mensaje en contestador":
      case "No volver a llamar":
        $("#fgInformarFecha,#fgInformarTurno").removeClass("hidden");
        $("#ddInformarFecha,#ddInformarTurno").attr("required", true);
        $("#fgInformarPublicador,#fgInformarObservaciones").addClass("hidden");
        $("#ddInformarPublicador,#txtInformarObservaciones").attr(
          "required",
          false
        );
        $("#btnInformarEnviar").attr("disabled", false);

        break;
      case "No existente":
      case "Revisita":
        $("#fgInformarFecha").removeClass("hidden");
        $("#ddInformarFecha").attr("required", true);
        $(
          "#fgInformarPublicador,#fgInformarObservaciones,#fgInformarTurno"
        ).addClass("hidden");
        $(
          "#ddInformarPublicador,#txtInformarObservaciones,#ddInformarTurno"
        ).attr("required", false);
        $("#btnInformarEnviar").attr("disabled", false);
        break;

      default:
        $(
          "#fgInformarFecha,#fgInformarTurno,#fgInformarPublicador,#fgInformarObservaciones"
        ).addClass("hidden");
        $("#btnInformarEnviar").attr("disabled", true);
    }
  });

  $("#btnInformarEnviar").click(async function () {
    if ($("#formInformar")[0].checkValidity()) {
      $("#cargando").modal("show");
      $("#modInformar").modal("hide");
      var reserva = selectedRecord.publicador.reserva[0];
      var dataJson = {
        Telefono: reserva.Telefono,
        Localidad: reserva.Localidad,
        Direccion: reserva.Direccion,
        Fecha: $("#ddInformarFecha").val(),
        Turno: $("#ddInformarTurno").val(),
        Estado: $("#ddInformarEstado").val(),
        Publicador: reserva.Publicador,
        Responsable: selectedRecord.responsable.responsable,
        Observaciones: $("#txtInformarObservaciones").val(),
      };
      if (await submit(dataJson)) {
        // window.open(linkwa);
        $("#modInformarSuccess").modal("show");

        //console.log("ok");
      } else {
        alert("Ocurrió un error. Intentá enviarlo de nuevo.");
      }

      $("#cargando").modal("hide");
    } else {
      $("#formres").find("#submit-hidden").click();
    }
  });
  $("#btnInformarCloseSuccess").click(function () {
    //loadJson(true);
    selectRecord("reservasResponsable", undefined, true);
    $("#modInformarSuccess").modal("hide");
    $(
      "#fgInformarFecha,#fgInformarTurno,#fgInformarPublicador,#fgInformarObservaciones"
    ).addClass("hidden");
    $("#btnInformarEnviar").attr("disabled", true);
  });

  //-----INFORMAR REVISITA-----
  $(document).on("click", "button[data-revisita]", async function () {
    $("#modRevisita").modal("show");
    await selectRecord("revisita", $(this).attr("data-revisita"));
    //$('#cargando').modal('show');
    var revisita = selectedRecord.publicador.revisita[0];
    //var data = jsonata('$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7]})').evaluate(jsonurl);

    $("#pRevisitaTelefono").text(revisita.Telefono);
    $("#pRevisitaPublicador").text(revisita.Publicador);
    $("#pRevisitaResponsable").text(selectedRecord.responsable.responsable);
    $("#pRevisitaDireccion").text(revisita.Direccion);
    $("#pRevisitaLocalidad").text(revisita.Localidad);
    //selpub = informarContacto["Publicador"];

    $("#btnRevisitaEnviar").attr("disabled", true);
    $('input[name="radioRevisita"]').prop("checked", false);

    $("#cargando").modal("hide");
  });
  $('input[name="radioRevisita"]').change(function () {
    console.log("changed");
    $("#btnRevisitaEnviar").attr("disabled", false);
  });

  $("#btnRevisitaEnviar").click(async function () {
    var revisita = selectedRecord.publicador.revisita[0];
    var dataJson = {
      Telefono: revisita.Telefono,
      Localidad: revisita.Localidad,
      Direccion: revisita.Direccion,
      Fecha: jsonata('$now("[Y0001]-[M01]-[D01]")').evaluate(),
      Estado: "Atendió",
      Publicador: revisita.Publicador,
      Responsable: selectedRecord.responsable.responsable,
      Observaciones: "",
    };
    switch ($("input[name='radioRevisita']:checked").val()) {
      case "radioRevisitaContinua":
        dataJson.Estado = "Revisita";
        dataJson.Observaciones = "Verificada continuidad de revisita";
        break;
      case "radioRevisitaFinaliza":
        dataJson.Estado = "Atendió";
        dataJson.Observaciones = "Fin de revisita";
        break;
    }
    $("#cargando").modal("show");
    $("#modRevisita").modal("hide");

    if (await submit(dataJson)) {
      // window.open(linkwa);
      $("#modRevisitaSuccess").modal("show");

      //console.log("ok");
    } else {
      alert("Ocurrió un error. Intentá enviarlo de nuevo.");
    }

    $("#cargando").modal("hide");
  });
  $("#btnRevisitaCloseSuccess").click(function () {
    //loadJson(true);
    selectRecord("revisitasResponsable", undefined, true);
    $("#modRevisitaSuccess").modal("hide");
    $("#btnRevisitaEnviar").attr("disabled", true);
    $('input[name="radioRevisita"]').prop("checked", false);
  });

  //loadJson(true);
  selectRecord();
});
