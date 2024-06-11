import { LegacyRect } from '@/spatial/legacyrect';
import { Point } from '@/spatial/point';

describe(LegacyRect, () => {
  describe('contains', () => {
    it('should return true if the point is on the upper-left corner of the rectangle', () => {
      const rectangle = new LegacyRect(0, 0, 10, 10);
      const point = new Point(0, 0);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the lower-right corner of the rectangle', () => {
      const rectangle = new LegacyRect(0, 0, 10, 10);
      const point = new Point(10, 10);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the upper-right corner of the rectangle', () => {
      const rectangle = new LegacyRect(0, 0, 10, 10);
      const point = new Point(10, 0);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the lower-left corner of the rectangle', () => {
      const rectangle = new LegacyRect(0, 0, 10, 10);
      const point = new Point(0, 10);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return false if the point is outside the rectangle', () => {
      const rectangle = new LegacyRect(0, 0, 10, 10);
      const point = new Point(15, 15);
      expect(rectangle.contains(point)).toBeFalse();
    });
  });

  describe('intersects', () => {
    it('should return true if the rectangles intersect', () => {
      const rectangle1 = new LegacyRect(0, 0, 10, 10);
      const rectangle2 = new LegacyRect(5, 5, 10, 10);
      expect(rectangle1.intersects(rectangle2)).toBeTrue();
    });

    it('should return false if the rectangles do not intersect', () => {
      const rectangle1 = new LegacyRect(0, 0, 10, 10);
      const rectangle2 = new LegacyRect(15, 15, 10, 10);
      expect(rectangle1.intersects(rectangle2)).toBeFalse();
    });

    it('should return true if one rectangle is completely inside the other', () => {
      const rectangle1 = new LegacyRect(0, 0, 10, 10);
      const rectangle2 = new LegacyRect(2, 2, 6, 6);
      expect(rectangle1.intersects(rectangle2)).toBeTrue();
    });

    it('should return true if the rectangles share a common edge', () => {
      const rectangle1 = new LegacyRect(0, 0, 10, 10);
      const rectangle2 = new LegacyRect(10, 0, 10, 10);
      expect(rectangle1.intersects(rectangle2)).toBeTrue();
    });

    it('should return true if the rectangles share a common corner', () => {
      const rectangle1 = new LegacyRect(0, 0, 10, 10);
      const rectangle2 = new LegacyRect(10, 10, 10, 10);
      expect(rectangle1.intersects(rectangle2)).toBeTrue();
    });
  });
});
