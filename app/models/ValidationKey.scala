package models

import com.mongodb.casbah.Imports._
import models.context._
import com.novus.salat.annotations._
import com.novus.salat.dao.SalatDAO
import java.util.UUID
import models.basics.BasicDAO

case class ValidationKey( key: String, userId: ObjectId, _id: ObjectId = new ObjectId )

object ValidationKey extends BasicDAO[ValidationKey]( "validations" ) {

  def createFor( user: User ) = {
    val key = UUID.randomUUID().toString().replace( "-", "" )
    insert( ValidationKey( key, user._id ) )
    key
  }

  def findOneByKey( validationKey: String ) = {
    for {
      el <- findOne( MongoDBObject( "key" -> validationKey ) )
      user <- User.findOneById( el.userId )
    } yield user
  }

  def remove( validationKey: String ) {
    remove( MongoDBObject( "key" -> validationKey ) )
  }
}