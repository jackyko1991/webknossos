/*
 * Copyright (C) 20011-2014 Scalable minds UG (haftungsbeschränkt) & Co. KG. <http://scm.io>
 */
package com.scalableminds.braingames.binary.store

import java.io.{File, FileInputStream, FileNotFoundException, FileOutputStream, InputStream, OutputStream}
import java.nio.file.{Files, Path, Paths}

import com.newrelic.api.agent.NewRelic
import com.scalableminds.braingames.binary.models.{DataLayer, LoadBlock, SaveBlock}
import com.scalableminds.util.io.PathUtils

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits._
import com.scalableminds.braingames.binary.MappingRequest
import net.liftweb.common.{Box, Empty, Failure, Full}
import com.scalableminds.util.geometry.Point3D
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import com.typesafe.scalalogging.LazyLogging
import org.apache.commons.io.{FilenameUtils, IOUtils}
import org.xerial.snappy.{SnappyFramedInputStream, SnappyFramedOutputStream}

/**
  * A data store implementation which uses the hdd as data storage
  */
class FileDataStore extends DataStore with LazyLogging with FoxImplicits {

  import FileDataStore._
  import DataStore._

  /**
    * Loads the due to x,y and z defined block into the cache array and
    * returns it.
    */
  def load(dataInfo: LoadBlock): Fox[Array[Byte]] = {
    val fileSize = dataInfo.dataSource.blockSize * dataInfo.dataLayer.bytesPerElement
    load(knossosBaseDir(dataInfo), dataInfo.dataSource.id, dataInfo.resolution,
      dataInfo.block, fileSize, dataInfo.dataLayer.isCompressed)
  }

  def load(dataSetDir: Path,
           dataSetId: String,
           resolution: Int,
           block: Point3D,
           fileSize: Int,
           isCompressed: Boolean): Fox[Array[Byte]] = {
    val ext = DataLayer.fileExt(isCompressed)
    lazy val fallback =
      fuzzyKnossosFile(dataSetDir, dataSetId, resolution, block, DataLayer.supportedFileExt)

    load(knossosFilePath(dataSetDir, dataSetId, resolution, block, ext), fallback, Some(fileSize))
  }

  def load(path: Path, fallback: => Option[File], fileSize: Option[Int] = None): Fox[Array[Byte]] = {
    Future {
      try {
        Box(PathUtils.fileOption(path)
          .filter(_.exists())
          .orElse(fallback)
          .map { file =>
            val t = System.currentTimeMillis
            val r = byteArrayFromFile(file, fileSize)
            NewRelic.recordResponseTimeMetric("Custom/FileDataStore/files-response-time", System.currentTimeMillis - t)
            NewRelic.incrementCounter("Custom/FileDataStore/files-loaded")
            r
          })
      } catch {
        case e: FileNotFoundException =>
          logger.info("File data store couldn't find file: " + path.toAbsolutePath)
          Failure("Couldn't find file: " + e.getMessage, Full(e), Empty)
        case e: Exception =>
          Failure("An exception occurred while trying to load: " + e.getMessage, Full(e), Empty)
      }
    }.recover{
      case e =>
        Failure("An exception on feature occurred while trying to load: " + e.getMessage, Full(e), Empty)
    }
  }

  def load(request: MappingRequest): Fox[Array[Byte]] = {
    logger.info("Loading mapping file: " + request.dataLayerMappingPath)
    load(Paths.get(request.dataLayerMappingPath), None)
  }

  private def createOutputStream(path: Path, compressionAllowed: Boolean) = {
    if(compressionAllowed)
      new SnappyFramedOutputStream(Files.newOutputStream(path))
    else
      Files.newOutputStream(path)
  }

  def save(dataInfo: SaveBlock): Fox[Boolean] = {
    save(knossosBaseDir(dataInfo), dataInfo.dataSource.id, dataInfo.resolution, dataInfo.block,
      dataInfo.data, dataInfo.dataLayer.isCompressed)
  }

  def save(dataSetDir: Path,
           dataSetId: String,
           resolution: Int,
           block: Point3D,
           data: Array[Byte],
           shouldBeCompressed: Boolean): Fox[Boolean] = {
    Future {
      val path = knossosFilePath(dataSetDir, dataSetId, resolution, block, DataLayer.fileExt(shouldBeCompressed))
      var binaryStream: OutputStream = null
      logger.info(s"Attempting write to: $path")
      try {
        PathUtils.parent(path.toAbsolutePath).map(p => Files.createDirectories(p))
        binaryStream = createOutputStream(path, shouldBeCompressed)
        logger.info("Created FileOutputStream")
        byteArrayToOutputStream(binaryStream, data)
        logger.info("Data was written")
        Full(true)
      } catch {
        case e: FileNotFoundException =>
          logger.error("File datastore couldn't write to file: " + path.toAbsolutePath)
          Failure("Couldn't write to file: " + e)
        case e: Exception =>
          logger.error("Unhandled exception while writing to file: " + e)
          Failure("Unhandled exception while writing to file: " + e)
      } finally {
        if(binaryStream != null) binaryStream.close()
      }
    }.recover{
      case e =>
        Failure("An exception on feature occurred while trying to load: " + e.getMessage, Full(e), Empty)
    }
  }
}

object FileDataStore {
  /**
    * Read file contents to a byte array
    */
  def inputStreamToByteArray(is: InputStream): Array[Byte] = {
    val result = IOUtils.toByteArray(is)
    is.close()
    result
  }

  def byteArrayFromFile(file: File, fileSize: Option[Int]): Array[Byte] = {
    FilenameUtils.getExtension(file.getAbsolutePath) match {
      case DataLayer.KnossosFileExtention | DataLayer.MappingFileExtention =>
        inputStreamToByteArray(new FileInputStream(file), fileSize.getOrElse(file.length().toInt))
      case DataLayer.CompressedFileExtention  =>
        inputStreamToByteArray(new SnappyFramedInputStream(new FileInputStream(file)))
    }
  }

  def inputStreamFromDataFile(file: File): InputStream = {
    FilenameUtils.getExtension(file.getAbsolutePath) match {
      case DataLayer.KnossosFileExtention =>
        new FileInputStream(file)
      case DataLayer.CompressedFileExtention  =>
        new SnappyFramedInputStream(new FileInputStream(file))
    }
  }

  def inputStreamToByteArray(is: InputStream, size: Int): Array[Byte] = {
    val byteArray = new Array[Byte](size)
    IOUtils.read(is, byteArray, 0, size)
    is.close()
    byteArray
  }

  /**
    * Writes byte array contents to a FileOutputStream
    */
  def byteArrayToOutputStream(os: OutputStream, data: Array[Byte]): Unit = {
    IOUtils.write(data, os)
  }
}
