package controllers.admin

import play.api.mvc.Controller
import play.api.mvc.Action
import brainflight.security.Secured
import views.html
import models.user._
import nml._
import models.task.Experiment
import models.security.Role
import nml.NMLParser
import xml.Xml
import play.api.Logger
import models.task.UsedExperiments

object NMLIO extends Controller with Secured {
  // TODO remove comment in production
  // override val DefaultAccessRole = Role( "admin" )

  def uploadForm = Authenticated { implicit request =>
    Ok(html.admin.nmlupload(request.user))
  }

  def upload = Authenticated(parse.multipartFormData) { implicit request =>
    request.body.file("nmlFile").map { nmlFile =>
      implicit val ctx = NMLContext(request.user)
      (new NMLParser(nmlFile.ref.file).parse).foreach { exp =>
        Logger.debug("Successfully parsed nmlFile")
        Experiment.save(exp)
        UsedExperiments.use(request.user, exp)
      }
      Ok("File uploaded")
    }.getOrElse {
      BadRequest("Missing file")
    }
  }

  def downloadList = Authenticated { implicit request =>
    val userExperiments = Experiment.findAll.groupBy(_.user).flatMap{ case (userId, experiments) =>
      User.findOneById(userId).map( _ -> experiments) 
    }
    Ok(html.admin.nmldownload(request.user, userExperiments))
  }

  def download(taskId: String) = Authenticated { implicit request =>
    (for {
      task <- Experiment.findOneById(taskId)
    } yield {
      Ok(Xml.toXML(task)).withHeaders(
        CONTENT_TYPE -> "application/octet-stream",
        CONTENT_DISPOSITION -> ("attachment; filename=%s.nml".format(task.dataSetName)))
    }) getOrElse BadRequest
  }

}