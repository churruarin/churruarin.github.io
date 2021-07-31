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

const settings = {
  limiteReservasMin: 1, //minimo de reservas sin restricciones
  limiteReservasMax: 10, //máximo de reservas antes de bloquear
  timeoutReservas: 5, //segundos de espera para hacer una reserva adicional
  tiempoMinReservas: 2.5, //minutos minimos entre reservas
  tiempoMaxReservas: 60, //dias desde la reserva mas antigua para bloquear un pub
  limiteReservasRespMin: 10, //minimo de reservas sin restricciones
  limiteReservasRespMax: 20, //máximo de reservas antes de bloquear
  tiempoMaxReservasResp: 60, //dias desde la reserva mas antigua para bloquear un resp
  tiempoInformeRevisitas: 30 //días para informar revisitas
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
    dataReservas: {
      interval : undefined,
      tipoReserva : undefined
    }
  },
  responsable: {
    responsable: Cookies.get("responsable"),
    reservas: {},
    revisitas: {},
    reservasStats:{}
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
  };
  if (tipo == "reservas") {
    //$[Respuesta="Reservado"]{Publicador:$count(Publicador)}
    //$map($[1], function ($v){$merge([$v,{"Reservas":$lookup($$[0],$v.Nombre)}])})
    //$map($[2], function ($v){$merge([$v,{"Reservas":$lookup($$[0],$v.Nombre),"Revisitas":$lookup($$[1],$v.Nombre)}])})
    //$map($[2], function ($v){($res:=$lookup($$[0],$v.Nombre);$rev:=$lookup($$[1],$v.Nombre);$merge([$v,{"Reservas":$res>0?$res:0,"Revisitas":$rev>0?$rev:0}]))})
    //$[Respuesta="Revisita"]{Publicador:$count(Publicador)}
  }

  return allRecords.publicadores;
}

async function revisitas(tipo, nombre, refresh) {
  if (refresh === true || jQuery.isEmptyObject(allRecords.revisitas) === true)
    await $.getJSON(urls.revisitas).done(function (jsonurl) {
      allRecords.revisitas = jsonata(
        '$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8], "Timestamp":$[9]})'
      ).evaluate(jsonurl);
    });
  revi = allRecords.revisitas;
  switch (tipo) { 
    case "responsable":
      revi = jsonata(
        '[$map($[Responsable="'+nombre+'"].$merge('+
          '[$,{"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"), "Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7)}])'+
      ',function ($v){($d:=$v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"}]))})]'
        
        ).evaluate(
        allRecords.revisitas
      );
      break;
    case "publicador":
      revi = jsonata(  '[$map($[Publicador="'+nombre+'"].$merge('+
      '[$,{"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"), "Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7)}])'+
  ',function ($v){($d:=$v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"}]))})]'
).evaluate(
        allRecords.revisitas
      );
      break;
    case "revisita":
      revi = jsonata(  '[$map($[Telefono="'+nombre+'"].$merge('+
      '[$,{"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"), "Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7)}])'+
  ',function ($v){($d:=$v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"}]))})]'
).evaluate(
        allRecords.revisitas
      );

      break;
  }

  return revi;
}

async function contactos(tipo, nombre, refresh) {
  if (refresh == true || jQuery.isEmptyObject(allRecords.contactos) === true)
    await $.getJSON(urls.contactos).done(function (jsonurl) {
      allRecords.contactos = jsonata(
        '$.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8],"Timestamp":$[9]})'
      ).evaluate(jsonurl);
    });

    /*        '$map($.values.({"Telefono":$[0], "Direccion":$[1], "Localidad":$[2], "Fecha":$[3], "Respuesta":$[4], "Publicador":$[5], "Turno":$[6], "Observaciones":$[7], "Responsable":$[8],' +
        '"Timestamp":$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),"TimestampIso":$fromMillis($toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"),' +
        '"Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis($[9],"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7),'+
        '"DireccionP":($[2]="Campaña celulares 2021"? $eval($[1]) : $[1] & ", " & $[2]),"PublicadorFecha":$[5] &" ("& $[3] &")" , "FechaP": ($[3] & ($boolean($[6]) ?(" por la "& $[6]) : ""))}), function($v){' +
        '$v.Localidad="Campaña celulares 2021"?$merge([$v,{"DireccionP":$map($v.DireccionP.[$number($.numdesde)..$number($.numhasta)], function($val){$v.DireccionP.area & "-" & $v.DireccionP.pre & "-" & $pad($string($val),-4,"0") })}]):$v})'
*/
  var contactos;
  switch (tipo) {
    case "asignar":
      if (typeof nombre === "undefined") {
        localidad = '[Localidad!="Campaña celulares 2021"]';
      } else {
        localidad = '[Localidad="' + nombre + '"]';
      }
      contactos = jsonata(
        '[$shuffle($[Respuesta!="Reservado"]' + localidad + ")[0]]"
      ).evaluate(allRecords.contactos);

      break;
    case "reservasPublicador":
      contactos = jsonata(
        '[$map($[Respuesta="Reservado"][Publicador="'+nombre+'"].$merge([$,{'+
        '"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),'+
         '"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"),'+
        '"Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7),'+
         '"DireccionP":(Localidad="Campaña celulares 2021"? $eval(Direccion) : Direccion & ", " & Localidad),'+ 
         '"FechaP": (Fecha & ($boolean(Turno) ?(" por la "& Turno) : ""))}]), function($v){('+
         '$loc:= $v.Localidad="Campaña celulares 2021"?{"DireccionP":$map($v.DireccionP.[$number($.numdesde)..$number($.numhasta)], function($val){$v.DireccionP.area & "-" & $v.DireccionP.pre & "-" & $pad($string($val),-4,"0") })}:{};'+
         '$d := $v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");'+
         '$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"},$loc])'+
          ')})]'
      ).evaluate(allRecords.contactos);
      selectedRecord.publicador.reservas = contactos;
      selectedRecord.publicador.reservasStats = jsonata('{"LastMillis":$max(Timestamp),"LastIso":$fromMillis($max(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"FirstMillis":$min(Timestamp),"FirstIso":$fromMillis($min(Timestamp), "[D01]/[M01]/[Y0001] [H01]:[m01]"),"Count":$count($),"FirstDays":$floor(($toMillis($now(undefined,"-0300"))-$min(Timestamp))/8.64e+7),"LastMins":$round(($toMillis($now(undefined,"-0300"))-$max(Timestamp))/60000,1)}').evaluate(contactos);
      break;

    case "reservasResponsable":
      contactos = jsonata(
        '[$map($[Respuesta="Reservado"][Responsable="'+nombre+'"].$merge([$,{'+
         '"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),'+
          '"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"),'+
         '"Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7),'+
          '"DireccionP":(Localidad="Campaña celulares 2021"? $eval(Direccion) : Direccion & ", " & Localidad),'+ 
          '"FechaP": (Fecha & ($boolean(Turno) ?(" por la "& Turno) : ""))}]), function($v){('+
          '$loc:= $v.Localidad="Campaña celulares 2021"?{"DireccionP":$map($v.DireccionP.[$number($.numdesde)..$number($.numhasta)], function($val){$v.DireccionP.area & "-" & $v.DireccionP.pre & "-" & $pad($string($val),-4,"0") })}:{};'+
          '$d := $v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");'+
          '$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"},$loc])'+
           ')})]'
      ).evaluate(allRecords.contactos);
      //selectedRecord.responsable.reservas = contactos;
      break;
    case "reserva":/*
      contactos = jsonata(
        '[$map($[Respuesta="Reservado"][Telefono="'+nombre+'"].$merge([$,{'+
        '"Timestamp":$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"),'+
         '"TimestampIso":$fromMillis($toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"), "[D01]/[M01]/[Y0001] [H01]:[m01]"),'+
        '"Days":$floor(($toMillis($now(undefined,"-0300"))-$toMillis(Timestamp,"[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01]"))/8.64e+7),'+
         '"DireccionP":(Localidad="Campaña celulares 2021"? $eval(Direccion) : Direccion & ", " & Localidad),'+ 
         '"FechaP": (Fecha & ($boolean(Turno) ?(" por la "& Turno) : ""))}]), function($v){('+
         '$loc:= $v.Localidad="Campaña celulares 2021"?{"DireccionP":$map($v.DireccionP.[$number($.numdesde)..$number($.numhasta)], function($val){$v.DireccionP.area & "-" & $v.DireccionP.pre & "-" & $pad($string($val),-4,"0") })}:{};'+
         '$d := $v.Days>1?$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]")&", hace "&$v.Days &" días":$fromMillis($v.Timestamp,"[D1]/[M1]/[Y0001]");'+
         '$merge([$v,{"PublicadorFecha":$v.Publicador&" ("&$d&")"},$loc])'+
          ')})]'
      ).evaluate(allRecords.contactos);
*/
contactos = jsonata('[$[Respuesta="Reservado"][Telefono="'+nombre+'"]]').evaluate(selectedRecord.responsable.reservas);
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

async function waLink(texto) {
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
    encodeURIComponent(texto
       );
  return link;
}

async function selectRecord(tipo, nombre, refresh) {
  switch (tipo) {
    case "responsables":
      var vresponsables = await responsables(undefined,undefined,refresh);
      var listitems = "";
  $("#selResponsable").empty();
  $.each(vresponsables, function (key, value) {
    listitems += "<option>" + value["Nombre"] + "</option>";
  });
  $("#selResponsable").append(listitems);
  $("#selResponsable").val(selectedRecord.responsable.responsable);
      break;
    case "reserva":
      selectedRecord.publicador.reserva = await contactos(
        "reserva",
        nombre,
        refresh
      );
      selectedRecord.publicador.reservas = await contactos(
        "reservasPublicador",
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

      selectedRecord.publicador.publicador = await publicadores(
        "publicador",
        selectedRecord.publicador.revisita[0].Publicador
      );
      selectedRecord.publicador.revisitas = await revisitas(
        "publicador",
        selectedRecord.publicador.publicador.Nombre
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

      var reservasCount = selectedRecord.responsable.reservas.length
      $("#tablereservas").removeClass("hidden");
      if (reservasCount == 1) {
        $("#hReservas").text("Hay una reserva hecha bajo tu responsabilidad");
        $("#spResponsableReservas").text(selectedRecord.responsable.reservas.length);
      } else if (reservasCount > 1) {
        $("#hReservas").text(
          "Hay " + reservasCount + " reservas hechas bajo tu responsabilidad"
        );
        $("#spResponsableReservas").text(selectedRecord.responsable.reservas.length);
      } else {
        $("#tablereservas").addClass("hidden");
        $("#spResponsableReservas").text("0");
      };

      if (reservasCount < settings.limiteReservasRespMin) {
        $("#pnlContactos").removeClass("hidden");
        $("#pnlWarningResp").addClass("hidden");
        $("#pnlInvalidResp").addClass("hidden");
      } else if (
        reservasCount >= settings.limiteReservasRespMin &&
        reservasCount < settings.limiteReservasRespMax
      ) {
        $("#pnlContactos").removeClass("hidden");
        $("#pnlWarningResp").removeClass("hidden");
        $("#pnlInvalidResp").addClass("hidden");
        $("#spWarningRespReservas").text(settings.limiteReservasRespMax);
        $("#spWarningRespDías").text(settings.tiempoMaxReservasResp);
      } else if (reservasCount >= settings.limiteReservasRespMax) {
        $("#pnlContactos").addClass("hidden");
        $("#pnlWarningResp").addClass("hidden");
        $("#pnlInvalidResp").removeClass("hidden");
      };
      selectedRecord.responsable.reservasStats.maxDays = jsonata("$max(Days)").evaluate(selectedRecord.responsable.reservas);
      if (selectedRecord.responsable.reservasStats.maxDays >= settings.tiempoMaxReservasResp) {
        $("#pnlContactos").addClass("hidden");
        $("#pnlWarningResp").addClass("hidden");
        $("#pnlInvalidResp").removeClass("hidden");
      };
 await selectRecord("publicadores",undefined,refresh);

      break;
    case "reservasPublicador":
      selectedRecord.publicador.reservas = await contactos(
        "reservasPublicador",
        nombre,
        refresh
      );

      await selectRecord("publicador", nombre);

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
      selectedRecord.responsable.revisitasPendientes = jsonata('[$[Days>='+settings.tiempoInformeRevisitas+']]').evaluate(selectedRecord.responsable.revisitas);
      selectedRecord.responsable.revisitasOk = jsonata('[$[Days<'+settings.tiempoInformeRevisitas+']]').evaluate(selectedRecord.responsable.revisitas);

      $("#tableRevisitasPendientes").bootstrapTable({
        data: selectedRecord.responsable.revisitasPendientes,
      });
      $("#tableRevisitasPendientes").bootstrapTable(
        "load",
        selectedRecord.responsable.revisitasPendientes
      );
      $("#divRevisitasPendientes").addClass("hidden");
      if ( selectedRecord.responsable.revisitasPendientes.length == 1) {
        $("#hRevisitasPendientes").text("Hay una revisita asignada bajo tu responsabilidad");
        $("#divRevisitasPendientes").removeClass("hidden");
        $("#spResponsableRevisitasPendientes").text(selectedRecord.responsable.revisitasPendientes.length);
      } else if (selectedRecord.responsable.revisitasPendientes.length > 1) {
        $("#hRevisitasPendientes").text(
          "Hay " + selectedRecord.responsable.revisitasPendientes.length + " revisitas asignadas bajo tu responsabilidad"
        );
        $("#divRevisitasPendientes").removeClass("hidden");
        $("#spResponsableRevisitasPendientes").text(selectedRecord.responsable.revisitasPendientes.length);
      } else {
        $("#divRevisitasPendientes").addClass("hidden");
        $("#spResponsableRevisitasPendientes").text("0");
      };

      $("#tableRevisitas").bootstrapTable({
        data: selectedRecord.responsable.revisitasOk,
      });
      $("#tableRevisitas").bootstrapTable(
        "load",
        selectedRecord.responsable.revisitasOk
      );

      $("#divRevisitas").addClass("hidden");
      if ( selectedRecord.responsable.revisitasOk.length == 1) {
        $("#hRevisitas").text("Hay una revisita asignada bajo tu responsabilidad");
        $("#divRevisitas").removeClass("hidden");
        $("#spResponsableRevisitas").text(selectedRecord.responsable.revisitasOk.length);
      } else if (selectedRecord.responsable.revisitasOk.length > 1) {
        $("#hRevisitas").text(
          "Hay " + selectedRecord.responsable.revisitasOk.length + " revisitas asignadas bajo tu responsabilidad"
        );
        $("#divRevisitas").removeClass("hidden");
        $("#spResponsableRevisitas").text(selectedRecord.responsable.revisitasOk.length);
      } else {
        $("#divRevisitas").addClass("hidden");
        $("#spResponsableRevisitas").text("0");
      };


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
      $("#cargando").modal("show");
      /*await Promise.all(selectRecord("reservasResponsable", undefined, true),
      selectRecord("revisitasResponsable", undefined, true),
      selectRecord("publicadores", undefined, true),
      responsables(undefined, undefined, true),
      selectRecord("territorios"));
        */
      var a = selectRecord("reservasResponsable", undefined, true);
      var b = selectRecord("revisitasResponsable", undefined, true);
      var d = responsables(undefined, undefined, true);
      await a;
      await b;
      await d;
      var c = selectRecord("publicadores", undefined);
      var e = selectRecord("territorios");
      await c;
      await e;

      if (selectedRecord.responsable.responsable === undefined) {
        await selectRecord("responsables");
        $("#modResponsable").modal("show");
      } else {
        $("#spResponsable").text(selectedRecord.responsable.responsable);
        $("#selResponsable").val(selectedRecord.responsable.responsable);
      }
      $("#cargando").modal("hide");
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
async function generarMensaje(tipo){
  var reservas = selectedRecord.publicador.reservas;
  var stats = selectedRecord.publicador.reservasStats;
var contacto = selectedRecord.publicador.reserva[0];
  var numReservas = reservas.length;
  var reservasPendientes = "*RESERVAS PENDIENTES DE INFORMAR*\n" + 
  "Por favor, no olvides informar estas llamadas al hermano que te los asignó. Si se exceden las " +
  settings.limiteReservasMax +
  " reservas o pasan " +
  settings.tiempoMaxReservas +
  " días ya no será posible enviarte más números. Gracias.\n" + 
  jsonata(
    '$.("*"&Telefono&"* el "&TimestampIso&", responsable: *"&Responsable&"*")~> $join("\n")'
  ).evaluate(reservas); 
  var txtReservas;
  
  switch (tipo) {
case "reserva":
  txtReservas = "";
  reservasPendientes ="";
  break;
case "reservaWarning":
  txtReservas =
  "\n\n*ATENCIÓN:* Hay *" +
  numReservas +
  " reservas hechas a tu nombre que aún no han sido informadas,* encontrarás el detalle *al final de este mensaje.*";
  break;
case "reservaBlockedDays":
  txtReservas =
  "*ATENCIÓN:* Hay *" +
  numReservas +
  " reservas hechas a tu nombre que aún no han sido informadas,* Como se ha excedido la cantidad de días para informarlas, *no es posible asginarte más números.*\n" +
  reservasPendientes +
  "\nPor favor,no olvides informar estas llamadas al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
  break;
  case "reservaBlockedNumber":
  txtReservas =
  "*ATENCIÓN:* Hay *" +
  numReservas +
  " reservas hechas a tu nombre que aún no han sido informadas,* Como has excedido el líimite de reservas sin informar, *no es posible asginarte más números.*\n" +
  reservasPendientes +
  "\nPor favor, no olvides informar estas llamadas al hermano que te los asignó para que puedas seguir recibiendo números. Gracias!";
  break;
case "revisitas":
  var txtRevisitas = jsonata(
    '$.("*"&Telefono&"* el "&TimestampIso&", responsable: *"&Responsable&"*")~> $join("\n")'
  ).evaluate(selectedRecord.publicador.revisitas);
  var plural = selectedRecord.publicador.revisitas.length>0?"s":"";
  txtRevisitas= " _Co. Churruarín_ \r\n*PREDICACIÓN TELEFÓNICA*\n\nHay *" + selectedRecord.publicador.revisitas.length + "* número"+plural+" reservado"+plural+" como *revisita"+plural+"* a tu nombre, que se detallan a continuación. Por favor, informales a los hermanos que te los asignaron si continuás revisitando a esos contactos. Gracias.\n\n" +
  txtRevisitas;

  
  break;
  };


  if (tipo == "revisitas") {return txtRevisitas;} 
  else if (contacto.Localidad=="Campaña celulares 2021") {
    
      contacto.Telefono = jsonata('$join($," \n")').evaluate(contacto.DireccionP);
      var reservaBody =
      "_Co. Churruarín_ \r\n*ASIGNACIÓN DE TERRITORIO TELEFÓNICO*\nCAMPAÑA DE PREDICACIÓN A TELÉFONOS CELULARES" +
      txtReservas +
      "\n\nSe te asignó la siguiente serie de números celulares para que los atiendas: \n" +
      contacto.Telefono +
      "\n\nPor favor, *no olvides informar* cuando completes esta serie. Llevar un buen registro es esencial para dar un buen testimonio. Gracias.\n\n" + reservasPendientes;
    return reservaBody  
  } else {
  var reservaBody =
  "_Co. Churruarín_ \r\n*ASIGNACIÓN DE TERRITORIO TELEFÓNICO*" +
  txtReservas +
  "\n\nSe te asignó el siguiente número telefónico para que lo atiendas: \nNúmero: *" +
  contacto.Telefono +
  "*\nDirección: *" +
  contacto.DireccionP +
  "*\nFue llamado la última vez: *" +
  contacto.FechaP +
  "*\nRespuesta a la última llamada: *" +
  contacto.Respuesta +
  "*\n\nPor favor, *no olvides informar* la respuesta del amo de casa al hermano que te asignó este número. Llevar un buen registro es esencial para dar un buen testimonio.  \nSi deseás reservar el número como *revisita*, por favor no olvides informarle al hermano cuando ya no lo sigas revisitando. Gracias.\n\n" + reservasPendientes;
return reservaBody  
};



};

function reservaDisplay(tipo){
  var reservas = selectedRecord.publicador.reservas;
  switch (tipo) {
    case "reserva":
      $("#spConfirmPub").text(selectedRecord.publicador.publicador.Nombre);
      $("#spConfirmResp").text(selectedRecord.responsable.responsable);
      $("#modConfirm").modal("show");
      break;
      case "reservaWarning":
        $("#cbWarningAdv").prop("checked", false);
        $("#cbWarningMore").prop("checked", false);
        $("#btnWarningEnviar").prop("disabled", true);
        clearInterval(selectedRecord.publicador.dataReservas.interval);
       // $("#divWarningAdv").addClass("hidden");
        $("#divTableWarning").removeClass("in");
        $("#spBtnWarningTimeout").text("");
        $("#tableWarning").bootstrapTable({
          data: reservas,
        });
        $("#tableWarning").bootstrapTable("load", reservas);
        $("#modWarning").modal("show");
        break;
        case "reservaBlockedDays":
          $("#modInvalid").modal("show");
          $("#pInvalid").text(
            "El publicador tiene reservas sin informar por más de " +
            settings.tiempoMaxReservas +
            " días."
          );
         
          $("#tableInvalid").bootstrapTable({
            data: reservas,
          });
          $("#tableInvalid").bootstrapTable("load", reservas);
          break;
          case "reservaBlockedNumber":
            $("#modInvalid").modal("show");
            $("#pInvalid").text(
              "El publicador excedió el límite de " + settings.limiteReservasMax + " reservas."
            );
        
            $("#tableInvalid").bootstrapTable({
              data: reservas,
            });
            $("#tableInvalid").bootstrapTable("load", reservas);
            break;
  }
}

async function reservaPrecheck(publicador,refresh) {
  $("#cargando").modal("show");
  await selectRecord("reservasPublicador", publicador, refresh);
  var reservas = selectedRecord.publicador.reservas;
  $("#cargando").modal("hide");
  var reservas = selectedRecord.publicador.reservas;
  var stats = selectedRecord.publicador.reservasStats;
  var numReservas = reservas.length;
  var tipo;
  if (numReservas < settings.limiteReservasMin) {
    tipo = "reserva";
  } else if (
    numReservas >= settings.limiteReservasMin &&
    numReservas < settings.limiteReservasMax
  ) {

    tipo = "reservaWarning";

  } else if (stats.firstDays > settings.tiempoMaxReservas) {

    tipo = "reservaBlockedDays";
  } else if (numReservas >= settings.limiteReservasMax) {

    tipo="reservaBlockedNumber";
  };
selectedRecord.publicador.dataReservas.tipoReserva = tipo;

  return tipo
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


$(document).ready(function () {
  


  if (zona != undefined) {
    $("#selZona").val(zona);
  }

  $("#btnRefresh").click(function () {
    selectRecord();
  });

  // $("button[name|='btnInformar']").click(function () {
  //   $("#modInformar").modal("show");
  // });


  // ------RESPONSABLE--------
  $("#nomResponsable").click(async function () {
    await selectRecord("responsables");
    $("#modResponsable").modal("show");
    $("#selResponsable").val(selectedRecord.responsable.responsable);
  });

  $("#spResponsable").text(selectedRecord.responsable.responsable);


  $("#btnResponsable").click(function () {
    if ($("#formresp")[0].checkValidity()) {
      selectedRecord.responsable.responsable = $("#selResponsable").find(":selected").text();
      Cookies.set("responsable", selectedRecord.responsable.responsable);
      $("#spResponsable").text(selectedRecord.responsable.responsable);
      $("#modResponsable").modal("hide");
      selectRecord();
    } else {
      $("#formresp").find("#submit-hiddenResp").click();
    }
  });


  // ------RESERVAR---------
  $("#selZona,#Publicador").change(function () {
    if ($("#selZona").val() != "" && $("#Publicador").val() != "") {
      $("#btnSelect").attr("disabled", false);
    } else {
      $("#btnSelect").attr("disabled", true);
    }
    zona = $("#selZona").val();
  });

  $("#btnSelect").click(async function () {
   reservaDisplay( await reservaPrecheck($("#Publicador").val()),true)
  });

  $("#cbWarningMore").change(function () {
    if (this.checked) {
      $("#divWarningAdv").removeClass("hidden");
      $("#spWarningTimeout").text(settings.timeoutReservas);
    } else {
      $("#divWarningAdv").addClass("hidden");
    }
  });

  $("#cbWarningAdv").change(function () {
    if (this.checked) {
      /*
      var counter = settings.timeoutReservas;

      selectedRecord.publicador.dataReservas.interval = setInterval(function () {
        counter--;
        $("#spBtnWarningTimeout").text("(" + counter + ")");
        // Display 'counter' wherever you want to display it.
        if (counter == 0) {
          // Display a login box*/
          $("#btnWarningEnviar").prop("disabled", false);
          /*$("#spBtnWarningTimeout").text("");
          clearInterval(selectedRecord.publicador.dataReservas.interval);
        }
      }, 1000);*/
    } else {
      $("#btnWarningEnviar").prop("disabled", true);
    }

  });


  $("#btnEnviar,#btnWarningEnviar").click(async function () {
    $("#modConfirm").modal("hide");
    $("#modWarning").modal("hide");
    $("#cargando").modal("show");
    var localidad = ($("#selZona").val() != "Indistinto") ? $("#selZona").val() : undefined;
    var contacto = await selectRecord("asignar", localidad, true);
    contacto = contacto[0]
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
      window.open(await waLink(await generarMensaje(selectedRecord.publicador.dataReservas.tipoReserva)));
      //window.opener.postMessage('close', 'https://churruar.in');
      $("#spSuccessPublicador").text(selectedRecord.publicador.publicador.Nombre);
      $("#spSuccessTelefono").text(selectedRecord.publicador.reserva[0].Telefono);
      $("#modSuccess").modal("show");

    } else {
      alert("Ocurrió un error. Intentá enviarlo de nuevo.");
    }
    $("#cargando").modal("hide");
  });

 $("#btnInformarReenviar,#btnReenviarwa").click(async function () {
    window.open(await waLink(await generarMensaje(await reservaPrecheck(selectedRecord.publicador.publicador.Nombre))));
  });
  
  $("#btnCloseSuccess").click(function () {
    selectRecord("reservasResponsable", undefined, true);
    $("#modSuccess").modal("hide");
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
    $('#cargando').modal('show');
    await selectRecord("reserva", $(this).attr("data-informar"), true);
    $('#cargando').modal('hide');
    $("#modInformar").modal("show");
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
    $('#cargando').modal('show');
    await selectRecord("revisita", $(this).attr("data-revisita"));
    $('#cargando').modal('hide');
    $("#modRevisita").modal("show");
    
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
  $("#btnRevisitaReenviar").click(async function () {
    // window.open(await waLink(await generarMensaje(await reservaPrecheck(selectedRecord.publicador.publicador.Nombre))));
    window.open(await waLink(await generarMensaje("revisitas")));
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
