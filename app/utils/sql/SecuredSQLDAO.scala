package utils.sql

import com.scalableminds.util.accesscontext.DBAccessContext
import com.scalableminds.util.tools.Fox
import models.user.User
import net.liftweb.common.Full
import oxalis.security.{SharingTokenContainer, UserSharingTokenContainer}
import utils.ObjectId

import javax.inject.Inject
import scala.concurrent.ExecutionContext

abstract class SecuredSQLDAO @Inject()(sqlClient: SqlClient)(implicit ec: ExecutionContext)
    extends SimpleSQLDAO(sqlClient) {
  protected def collectionName: String
  protected def existingCollectionName: SqlToken = SqlToken.raw(collectionName + "_")

  protected def anonymousReadAccessQ(sharingToken: Option[String]): SqlToken = q"${false}"
  protected def readAccessQ(requestingUserId: ObjectId): SqlToken = q"${true}"
  protected def updateAccessQ(requestingUserId: ObjectId): SqlToken = readAccessQ(requestingUserId)
  protected def deleteAccessQ(requestingUserId: ObjectId): SqlToken = readAccessQ(requestingUserId)

  protected def readAccessQuery(implicit ctx: DBAccessContext): Fox[SqlToken] =
    if (ctx.globalAccess) Fox.successful(q"${true}")
    else {
      for {
        userIdBox <- userIdFromCtx.futureBox
      } yield {
        userIdBox match {
          case Full(userId) => readAccessFromUserOrToken(userId, sharingTokenFromCtx)(ctx)
          case _            => anonymousReadAccessQ(sharingTokenFromCtx)
        }
      }
    }

  def assertUpdateAccess(id: ObjectId)(implicit ctx: DBAccessContext): Fox[Unit] =
    if (ctx.globalAccess) Fox.successful(())
    else {
      for {
        userId <- userIdFromCtx ?~> "FAILED: userIdFromCtx"
        resultList <- run(
          q"SELECT _id FROM $existingCollectionName WHERE _id = $id and (${updateAccessQ(userId)})"
            .as[String]) ?~> "Failed to check write access. Does the object exist?"
        _ <- resultList.headOption.toFox ?~> "No update access."
      } yield ()
    }

  def assertDeleteAccess(id: ObjectId)(implicit ctx: DBAccessContext): Fox[Unit] =
    if (ctx.globalAccess) Fox.successful(())
    else {
      for {
        userId <- userIdFromCtx
        resultList <- run(
          q"SELECT _id FROM $existingCollectionName WHERE _id = $id and (${deleteAccessQ(userId)})"
            .as[String]) ?~> "Failed to check delete access. Does the object exist?"
        _ <- resultList.headOption.toFox ?~> "No delete access."
      } yield ()
    }

  protected def userIdFromCtx(implicit ctx: DBAccessContext): Fox[ObjectId] =
    ctx.data match {
      case Some(user: User) => Fox.successful(user._id)
      case Some(userSharingTokenContainer: UserSharingTokenContainer) =>
        Fox.successful(userSharingTokenContainer.user._id)
      case _ => Fox.failure("Access denied.")
    }

  protected def accessQueryFromAccessQWithPrefix(accessQ: (ObjectId, SqlToken) => SqlToken, prefix: SqlToken)(
      implicit ctx: DBAccessContext): Fox[SqlToken] =
    if (ctx.globalAccess) Fox.successful(q"${true}")
    else {
      for {
        userIdBox <- userIdFromCtx.futureBox
      } yield {
        userIdBox match {
          case Full(userId) => q"(${accessQ(userId, prefix)})"
          case _            => q"${false}"
        }
      }
    }

  protected def accessQueryFromAccessQ(accessQ: ObjectId => SqlToken)(implicit ctx: DBAccessContext): Fox[SqlToken] =
    if (ctx.globalAccess) Fox.successful(q"${true}")
    else {
      for {
        userIdBox <- userIdFromCtx.futureBox
      } yield {
        userIdBox match {
          case Full(userId) => q"(${accessQ(userId)})"
          case _            => q"${false}"
        }
      }
    }

  private def sharingTokenFromCtx(implicit ctx: DBAccessContext): Option[String] =
    ctx.data match {
      case Some(sharingTokenContainer: SharingTokenContainer) => Some(sanitize(sharingTokenContainer.sharingToken))
      case Some(userSharingTokenContainer: UserSharingTokenContainer) =>
        userSharingTokenContainer.sharingToken.map(sanitize)
      case _ => None
    }

  private def readAccessFromUserOrToken(userId: ObjectId, tokenOption: Option[String])(
      implicit ctx: DBAccessContext): SqlToken =
    tokenOption match {
      case Some(_) => q"((${anonymousReadAccessQ(sharingTokenFromCtx)}) OR (${readAccessQ(userId)}))"
      case _       => q"(${readAccessQ(userId)})"
    }

}
