/*
 * Copyright (C) 20011-2014 Scalable minds UG (haftungsbeschränkt) & Co. KG. <http://scm.io>
 */
package com.scalableminds.util.tools

import scala.concurrent.{ExecutionContext, Future}
import net.liftweb.common.{Failure, Empty, Full, Box}

trait FoxImplicits {
  implicit def futureBox2Fox[T](f: Future[Box[T]])(implicit ec: ExecutionContext) =
    new Fox(f)

  implicit def box2Fox[T](b: Box[T])(implicit ec: ExecutionContext) =
    new Fox(Future.successful(b))

  implicit def future2Fox[T](f: Future[T])(implicit ec: ExecutionContext) =
    new Fox(f.map(Full(_)))

  implicit def option2Fox[T](b: Option[T])(implicit ec: ExecutionContext) =
    new Fox(Future.successful(Box(b)))

  implicit def futureOption2Fox[T](f: Future[Option[T]])(implicit ec: ExecutionContext) =
    new Fox(f.map(Box(_)))
}


object Fox{
  def apply[A](future: Future[Box[A]])(implicit ec: ExecutionContext)  =
    new Fox(future)

  def successful[A](e: A)(implicit ec: ExecutionContext)  =
    new Fox(Future.successful(Full(e)))

  def empty(implicit ec: ExecutionContext) = new Fox(Future.successful(Empty))

  def failure(message: String, ex: Box[Throwable] = Empty, chain: Box[Failure] = Empty)(implicit ec: ExecutionContext)  =
    new Fox(Future.successful(Failure(message, ex, chain)))

  def sequence[T](l: List[Fox[T]])(implicit ec: ExecutionContext): Future[List[Box[T]]] =
    Future.sequence(l.map(_.futureBox))

  def combined[T](l: List[Fox[T]])(implicit ec: ExecutionContext): Fox[List[T]] = Fox(
    Future.sequence(l.map(_.futureBox)).map{ results =>
      results.find(_.isEmpty) match {
        case Some(Empty) => Empty
        case Some(failure : Failure) => failure
        case _ => Full(results.map(_.openOrThrowException("An exception should never be thrown, all boxes must be full")))
      }
    })

  def sequenceOfFulls[T](l: List[Fox[T]])(implicit ec: ExecutionContext): Future[List[T]] =
    Future.sequence(l.map(_.futureBox)).map{ results =>
      results.foldRight(List.empty[T]){
        case (_ : Failure, l) => l
        case (Empty, l) => l
        case (Full(e), l) => e :: l
      }
    }
}

class Fox[+A](val futureBox: Future[Box[A]])(implicit ec: ExecutionContext) {
  val self = this

  def ?~>(s: String) =
    new Fox(futureBox.map(_ ?~ s))

  def ~>[T](errorCode: => T) =
    new Fox(futureBox.map(_ ~> errorCode))

  def orElse[B >: A](fox: Fox[B]): Fox[B] =
    new Fox(futureBox.flatMap{
      case Full(t) => this.futureBox
      case _ => fox.futureBox
    })

  def getOrElse[B >: A](b: B): Future[B] =
    futureBox.map(_.getOrElse(b))

  def map[B](f: A => B): Fox[B] =
    new Fox(futureBox.map(_.map(f)))

  def flatMap[B](f: A => Fox[B]): Fox[B] =
    new Fox(futureBox.flatMap {
      case Full(t) =>
        f(t).futureBox
      case Empty =>
        Future.successful(Empty)
      case fail: Failure =>
        Future.successful(fail)
    })

  def filter(f: A => Boolean): Fox[A] = {
    new Fox(futureBox.map(_.filter(f)))
  }

  def foreach(f: A => _): Unit = {
    futureBox.map(_.map(f))
  }

  /**
   * Helper to force an implicit conversation
   */
  def toFox = this

  /**
   * Makes Box play better with Scala 2.8 for comprehensions
   */
  def withFilter(p: A => Boolean): WithFilter = new WithFilter(p)

  /**
   * Play NiceLike with the Scala 2.8 for comprehension
   */
  class WithFilter(p: A => Boolean) {
    def map[B](f: A => B): Fox[B] = self.filter(p).map(f)

    def flatMap[B](f: A => Fox[B]): Fox[B] = self.filter(p).flatMap(f)

    def foreach[U](f: A => U): Unit = self.filter(p).foreach(f)

    def withFilter(q: A => Boolean): WithFilter =
      new WithFilter(x => p(x) && q(x))
  }

}