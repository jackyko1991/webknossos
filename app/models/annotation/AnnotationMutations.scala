package models.annotation

import com.scalableminds.braingames.datastore.tracings.TracingType
import com.scalableminds.util.io.NamedStream
import com.scalableminds.util.mvc.BoxImplicits
import com.scalableminds.util.reactivemongo.DBAccessContext
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import models.project.{Project, WebknossosAssignmentConfig}
import models.task.{OpenAssignmentService, Task}
import models.user.User
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json.JsValue
import reactivemongo.bson.BSONObjectID

/**
 * Company: scalableminds
 * User: tmbo
 * Date: 21.01.14
 * Time: 14:06
 */

class AnnotationMutations(val annotation: Annotation) extends BoxImplicits with FoxImplicits {

  type AType = Annotation

  def finishAnnotation(user: User)(implicit ctx: DBAccessContext): Fox[(Annotation, String)] = {
    def executeFinish(annotation: Annotation): Fox[(Annotation, String)] = {
      for {
        updated <- AnnotationService.finish(annotation)
      } yield {
        if (annotation._task.isEmpty)
          updated -> "annotation.finished"
        else
          updated -> "task.finished"
      }
    }

    if (annotation.restrictions.allowFinish(user)) {
      if (annotation.state.isInProgress)
        executeFinish(annotation)
      else
          Fox.failure("annotation.notInProgress")
    } else {
      Fox.failure("annotation.notPossible")
    }
  }

  def reopen()(implicit ctx: DBAccessContext) = {
    AnnotationDAO.reopen(annotation._id)
  }

  def rename(name: String)(implicit ctx: DBAccessContext) =
    AnnotationDAO.rename(annotation._id, name)

  def cancelTask()(implicit ctx: DBAccessContext) = {
    def insertReplacement(task: Task, project: Project) = {
      project.assignmentConfiguration match {
        case WebknossosAssignmentConfig =>
          OpenAssignmentService.insertOneFor(task, project)
        case _ =>
          // If this is a project with its assignments on MTurk, they will handle the replacement generation
          Fox.successful(true)
      }
    }

    for {
      task <- annotation.task
      project <- task.project
      _ <- insertReplacement(task, project)
      _ <- AnnotationDAO.updateState(annotation, AnnotationState.Unassigned)
    } yield annotation
  }

  def incrementVersion()(implicit ctx: DBAccessContext) =
    AnnotationDAO.incrementVersion(annotation._id)

  def resetToBase()(implicit ctx: DBAccessContext): Fox[Annotation] = annotation.typ match {
    //TODO: RocksDB: test this
    case AnnotationType.Explorational =>
      Fox.failure("annotation.revert.skeletonOnly")
    case AnnotationType.Task if annotation.tracingType == TracingType.skeleton =>
      for {
        task <- annotation.task.toFox
        annotationBase <- task.annotationBase
        newTracingReference <- AnnotationService.tracingFromBase(annotationBase)
        updatedAnnotation <- AnnotationDAO.updateTracingRefernce(annotation._id, newTracingReference)
      } yield {
        updatedAnnotation
      }
    case _ if annotation.tracingType != TracingType.skeleton =>
      Fox.failure("annotation.revert.skeletonOnly")
  }

  def transferToUser(user: User)(implicit ctx: DBAccessContext) = {
    for {
      updatedAnnotation <- AnnotationDAO.transfer(annotation._id, user._id)
    } yield updatedAnnotation
  }
}
