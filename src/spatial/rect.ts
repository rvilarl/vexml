import { Point } from './point';
import { Shape } from './types';

/** Represents a rectangle in a 2D coordinate system. */
export class Rect implements Shape {
  constructor(
    /** upper-left corner x-coordinate */
    public readonly x: number,
    /** upper-left corner y-coordinate */
    public readonly y: number,
    /** total width */
    public readonly w: number,
    /** total height */
    public readonly h: number
  ) {}

  static fromRectLike(rectLike: { x: number; y: number; w: number; h: number }): Rect {
    return new Rect(rectLike.x, rectLike.y, rectLike.w, rectLike.h);
  }

  origin(): Point {
    return new Point(this.x, this.y);
  }

  center(): Point {
    return new Point(this.x + this.w / 2, this.y + this.h / 2);
  }

  corners(): [upperLeft: Point, upperRight: Point, bottomRight: Point, bottomLeft: Point] {
    return [
      new Point(this.x, this.y),
      new Point(this.x + this.w, this.y),
      new Point(this.x + this.w, this.y + this.h),
      new Point(this.x, this.y + this.h),
    ];
  }

  quadrants(): [upperRight: Rect, upperLeft: Rect, bottomLeft: Rect, bottomRight: Rect] {
    const halfWidth = this.w / 2;
    const halfHeight = this.h / 2;
    const upperRight = new Rect(this.x + halfWidth, this.y, halfWidth, halfHeight);
    const upperLeft = new Rect(this.x, this.y, halfWidth, halfHeight);
    const bottomLeft = new Rect(this.x, this.y + halfHeight, halfWidth, halfHeight);
    const bottomRight = new Rect(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight);
    return [upperRight, upperLeft, bottomLeft, bottomRight];
  }

  contains(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
  }
}
