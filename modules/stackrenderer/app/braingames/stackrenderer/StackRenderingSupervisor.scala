package braingames.stackrenderer

import akka.actor.Actor
import akka.agent.Agent
import akka.actor.Props
import play.api.Play
import akka.actor.actorRef2Scala
import models.knowledge._
import play.api.libs.ws.WS
import play.api.Logger
import models.knowledge.StackRenderingChallenge
import models.knowledge.StacksInProgress._
import play.api.libs.concurrent.Execution.Implicits._
import akka.routing.SmallestMailboxRouter
import scala.concurrent.duration._
import braingames.util.StartableActor
import models.stackrenderer.TemporaryStores._

case class FinishedStack(stack: Stack)
case class FailedStack(stack: Stack)
case class FinishedUpload(stack: Stack)
case class StartRendering()
case class StopRendering()
case class EnsureWork()

class StackRenderingSupervisor extends Actor {

  implicit val system = context.system

  val currentlyRequestingWork = Agent[Boolean](false)

  val stacksInRendering = Agent[Map[String, Stack]](Map.empty)

  val nrOfStackRenderers = 4

  val conf = Play.current.configuration

  val levelcreatorBaseUrl =
    conf.getString("levelcreator.baseUrl") getOrElse ("http://localhost:9000")

  val requestWorkUrl = levelcreatorBaseUrl + "/renderer/requestWork"
  val finishedWorkUrl = levelcreatorBaseUrl + "/renderer/finishedWork"
  val failedWorkUrl = levelcreatorBaseUrl + "/renderer/failedWork"
  val binaryDataUrl = "http://localhost:9095/binary/ajax"
  val useLevelUrl = levelcreatorBaseUrl + "/levels/%s?missionId=%s"

  lazy val stackRenderer = context.system.actorOf(Props(new StackRenderer(useLevelUrl, binaryDataUrl)).withRouter(SmallestMailboxRouter(nrOfInstances = nrOfStackRenderers)),
    name = "stackRenderer")

  lazy val stackUploader = S3Uploader.start(conf, system)

  def receive = {
    case StopRendering() =>
    //TODO: Stop it
    case StartRendering() =>
      self ! EnsureWork()

    case FinishedStack(stack) =>
      stacksInRendering.send(_ - stack.id)
      stackUploader ! UploadStack(stack)

    case FailedStack(stack) =>
      stacksInRendering.send(_ - stack.id)
      reportFailedWork(stack.id)

    case FinishedUpload(stack) =>
      reportFinishedWork(stack.id)

    case EnsureWork() =>
      ensureEnoughWork
      context.system.scheduler.scheduleOnce(1 second) {
        self ! EnsureWork()
      }
  }

  def ensureEnoughWork = {
    if (stacksInRendering().size < nrOfStackRenderers)
      requestWork
  }

  def reportFailedWork(id: String) = {
    WS
      .url(failedWorkUrl)
      .withQueryString("key" -> id)
      .get()
      .map { response =>
        response.status match {
          case 200 =>
            Logger.debug(s"Successfully reported FAILED work for $id")
          case s =>
            Logger.error(s"Failed to report FAILED work for $id. Status: $s")
        }
      }
      .recover {
        case e =>
          Logger.error("ReportFailedWork. An exception occoured: " + e)
      }
  }

  def reportFinishedWork(id: String) = {
    WS
      .url(finishedWorkUrl)
      .withQueryString("key" -> id)
      .get()
      .map { response =>
        response.status match {
          case 200 =>
            Logger.debug(s"Successfully reported finished work for $id")
          case s =>
            Logger.error(s"Failed to report finished work for $id. Status: $s")
        }
      }
      .recover {
        case e =>
          Logger.error("ReportFinishedWork. An exception occoured: " + e)
      }
  }

  /**
   * There is some kind of semaphore around this function using
   * currentlyRequestingWork. In general there is no problem when requesting
   * multiple challenges, but the semaphore ensures that there are not to many
   * requests issued if there are network delays.
   */
  def requestWork = {
    if (!currentlyRequestingWork()) {
      currentlyRequestingWork.send(true)
      WS
        .url(requestWorkUrl)
        .get()
        .map { response =>
          response.status match {
            case 200 =>
              response.json.asOpt[Stack].map { stack =>
                Logger.debug(s"Successfully requested work ${stack.id}. Level: ${stack.level.id} Mission: ${stack.mission.id}")
                levelStore.insert(stack.level.id, stack.level)
                missionStore.insert(stack.mission.id, stack.mission)
                stacksInRendering.send(_ + (stack.id -> stack))
                stackRenderer ! RenderStack(stack)
              }
            case 204 =>
              Logger.warn("Levelcreator reported no work!")
            case s =>
              Logger.error("Levelcreator work request returned unknown status code: " + s)
          }
          currentlyRequestingWork.send(false)
        }
        .recover {
          case e =>
            Logger.error("RequestWork. An exception occoured: " + e)
            currentlyRequestingWork.send(false)
        }
    }
  }
}

object StackRenderingSupervisor extends StartableActor[StackRenderingSupervisor] {
  val name = "stackRenderingSupervisor"
}