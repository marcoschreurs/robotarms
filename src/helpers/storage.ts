import { RobotArm, Slider, Axis } from "../hardware";
import { logger } from '../logger';

const columnCount = 6;
const columnSpacing = 40;
const rowSpacing = 82;


// const sliderPositionZero = 155;
const pickupPosition = { X: 168, Y: 0, Z: 43.5, A: 0, B: -90, C: 0};
const pickUpDistance = 52;

export abstract class Storage {
  public static readonly columnCount = 6; // Number of columns in the storage rack
  public static readonly columnSpacing = 40; // Distance between columns
  public static readonly rowSpacing = 82 // Distance between rows

  public static readonly sliderPositionColumnZero = 157;

  public static async retrieveItem(arm: RobotArm, slider: Slider, index: number) {
    const row = Storage.calculateRow(index);
    const column = Storage.calculateColumn(index);

    // +1 zero based vs one based, one based is more readable for humans ;)
    logger.info(`[Storage] Retrieving item on row: ${row + 1} and in column: ${column + 1}`);

    // Move arm and slider to pick up position
    await arm.goToCoordinateAbsolute({ ...pickupPosition, Z: Storage.calculateHeightPosition(row)});
    await slider.moveTo(Storage.calculateSliderPosition(column));

    // Move towards item, turn on suction, move up and then backwards
    await arm.moveAxisRelative(Axis.X, pickUpDistance)
    await arm.turnOnSuctionCup()
    await arm.moveAxisRelative(Axis.Z, 15)
    await arm.moveAxisRelative(Axis.X, -55)
  }

  public static async storeItem(arm: RobotArm, slider: Slider, index: number) {
    const row = Storage.calculateRow(index);
    const column = Storage.calculateColumn(index);

    logger.info(`[Storage] Storing item on row: ${row + 1} and in column: ${column + 1}`);

    // Move arm and slider to drop off position
    await slider.moveTo(Storage.calculateSliderPosition(column));
    await arm.goToCoordinateAbsolute({ ...pickupPosition, Z: Storage.calculateHeightPosition(row)});

    /* Rotate the arm/block, this improves accuracy
     * - Helps with the angle the block has to the arm after picking up
     * - It flips X/Y so to say, turning the excessive play in the slide and therefore
     *   accuracy into vertical play instead of horizontal play
     */
    await arm.connectBox.send('M21 G91 C-90')

    // Raise the arm slightly, move into the storage position, lower, turn off suction and back off
    const forwardDistance = 47;
    await arm.moveAxisRelative(Axis.Z, 15)
    await arm.moveAxisRelative(Axis.X, forwardDistance)
    await arm.moveAxisRelative(Axis.Z, -15)
    await arm.turnOffSuctionCup()
    await arm.moveAxisRelative(Axis.X, -forwardDistance)

    // Rotate back, see comments above
    await arm.connectBox.send('M21 G91 C90')
  }

  // Calculate the column based on the index
  public static calculateColumn(index: number): number {
    return index % columnCount;
  }

  // Calculate the row based on the index
  public static calculateRow(index: number): number {
    return Math.floor(index / columnCount);
  }

  // Calculate the slider position for the given column
  private static calculateSliderPosition(column: number): number {
    return Storage.sliderPositionColumnZero + (column * columnSpacing)
  }

  // Calculate the arm height for the given row
  private static calculateHeightPosition(row: number): number {
    return pickupPosition.Z + (row * rowSpacing)
  }
}
