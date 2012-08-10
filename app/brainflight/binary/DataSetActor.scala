package brainflight.binary

import akka.actor.Actor
import brainflight.tools.geometry.Point3D
import models.DataSet
import brainflight.tools.geometry.Cuboid
import scala.collection.mutable.ArrayBuffer

case class SingleRequest( dataSet: DataSet, resolution: Int, point: Point3D )
case class MultiCubeRequest( requests: Array[CubeRequest] )
case class CubeRequest( dataSet: DataSet, resolution: Int, points: Cuboid)

class DataSetActor extends Actor {
  val dataStore: DataStore = new FileDataStore( models.Agents.BinaryCacheAgent )
  def receive = {
    case SingleRequest( dataSet, resolution, point ) =>
      sender ! dataStore.load( dataSet, resolution, point )
    case CubeRequest( dataSet, resolution, points ) =>
      sender ! dataStore.load( dataSet, resolution, points )
    case MultiCubeRequest( requests ) =>
      val results = requests.map( r =>
        dataStore.load( r.dataSet, r.resolution, r.points))
      sender ! Array.concat( results: _*)
  }
} 
