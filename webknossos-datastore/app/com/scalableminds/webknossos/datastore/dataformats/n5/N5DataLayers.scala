package com.scalableminds.webknossos.datastore.dataformats.n5

import com.scalableminds.util.geometry.{BoundingBox, Vec3Int}
import com.scalableminds.webknossos.datastore.dataformats.MagLocator
import com.scalableminds.webknossos.datastore.models.datasource.LayerViewConfiguration.LayerViewConfiguration
import com.scalableminds.webknossos.datastore.models.datasource._
import play.api.libs.json.{Json, OFormat}

trait N5Layer extends DataLayer {

  val dataFormat: DataFormat.Value = DataFormat.n5

  lazy val bucketProvider = new N5BucketProvider(this)

  def resolutions: List[Vec3Int] = mags.map(_.mag)

  def mags: List[MagLocator]

  def lengthOfUnderlyingCubes(resolution: Vec3Int): Int = Int.MaxValue // Prevents the wkw-shard-specific handle caching

  def numChannels: Option[Int] = Some(if (elementClass == ElementClass.uint24) 3 else 1)
}

case class N5DataLayer(
    name: String,
    category: Category.Value,
    boundingBox: BoundingBox,
    elementClass: ElementClass.Value,
    mags: List[MagLocator],
    defaultViewConfiguration: Option[LayerViewConfiguration] = None,
    adminViewConfiguration: Option[LayerViewConfiguration] = None,
    override val numChannels: Option[Int] = Some(1)
) extends N5Layer

object N5DataLayer {
  implicit val jsonFormat: OFormat[N5DataLayer] = Json.format[N5DataLayer]
}

case class N5SegmentationLayer(
    name: String,
    boundingBox: BoundingBox,
    elementClass: ElementClass.Value,
    mags: List[MagLocator],
    largestSegmentId: Option[Long],
    mappings: Option[Set[String]] = None,
    defaultViewConfiguration: Option[LayerViewConfiguration] = None,
    adminViewConfiguration: Option[LayerViewConfiguration] = None,
    override val numChannels: Option[Int] = Some(1)
) extends SegmentationLayer
    with N5Layer

object N5SegmentationLayer {
  implicit val jsonFormat: OFormat[N5SegmentationLayer] = Json.format[N5SegmentationLayer]
}