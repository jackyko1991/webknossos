### define
jquery : $
###

Modal =

  callbacks : {}

  show : (text, buttons) ->
    # buttons: [{id:..., label:..., callback:...}, ...]

    html =  "<div class=\"modal-body\"><p>" + text + "</p></div>"

    html += "<div class=\"modal-footer\">"
    for button in buttons
      html += "<a href=\"#\" id=\"" + button.id + "\" class=\"btn btn-default\">" +
                    button.label + "</a>"
    html += "</div>"

    $("#modal").html(html)

    for button in buttons

      @callbacks[button.id] = button.callback

      $("#" + button.id).on("click", (evt) =>

        callback = @callbacks[evt.target.id]
        if callback?
          callback()
        $("#modal").modal("hide"))

    $("#modal").modal("show")


  hide : ->

    $("#modal").modal("hide")
