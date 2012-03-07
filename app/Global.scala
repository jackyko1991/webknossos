import brainflight.binary.{ FrustumModel, CubeModel, ModelStore }
import brainflight.tools.geometry._
import play.api._

import models._

object Global extends GlobalSettings {

  override def onStart( app: Application ) {
    ModelStore.register( CubeModel, FrustumModel )
    if ( Play.current.mode == Mode.Dev )
      InitialData.insert()
  }

}

/**
 * Initial set of data to be imported
 * in the sample application.
 */
object InitialData {

  def insert() = {
    if ( RouteOrigin.findAll.isEmpty ) {
      val matrix = List[Float]( 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2000, 1000, 1000, 1 )
      RouteOrigin.insert( RouteOrigin( TransformationMatrix( matrix ), 0 ) )
    }

    if ( User.findAll.isEmpty ) {

      val u = ( "scmboy@scalableminds.com", "SCM Boy", "secret" )
      Seq(
        u ).foreach( User.create _ tupled )
    }

    if ( Role.findAll.isEmpty ) {
      Role.insert( Role( "user", Nil ) )
      Role.insert( Role( "admin", Permission( "*", "*" :: Nil ) :: Nil ) )
    }

  }

}