import { VisitorInterface } from "@rtsdk/topia";
import { Visitor } from "./topiaInit.js";
import { Credentials, VisitorDataObjectType } from "../types/index.js";
import { DEFAULT_VISITOR_DATA } from "../constants.js";
import { standardizeError } from "./standardizeError.js";

/**
 * Fetches the visitor and guarantees their data object has every default field before anything updates it.
 * - Empty record (first visit): setDataObject with DEFAULT_VISITOR_DATA
 * - Existing record missing fields: updateDataObject with only the missing defaults, so nothing already saved
 *   (booth ownership, placed decor, counters) is overwritten — setDataObject would wipe the whole record
 * Pass shouldGetVisitorDetails when you need visitor details such as isAdmin (uses Visitor.get).
 */
export const getVisitor = async (credentials: Credentials, shouldGetVisitorDetails = false) => {
  try {
    const { profileId, urlSlug, visitorId } = credentials;

    let visitor: VisitorInterface;
    if (shouldGetVisitorDetails) visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    else visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw "Not in world";

    const dataObject = ((await visitor.fetchDataObject()) || {}) as Partial<VisitorDataObjectType>;
    const lockId = `visitor_data_init_${profileId}_${Math.floor(Date.now() / 60000) * 60000}`;

    const missingDefaults = Object.fromEntries(
      Object.entries(DEFAULT_VISITOR_DATA).filter(([key]) => dataObject[key as keyof VisitorDataObjectType] === undefined),
    );

    if (Object.keys(dataObject).length === 0) {
      await visitor.setDataObject(DEFAULT_VISITOR_DATA, { lock: { lockId, releaseLock: true } });
    } else if (Object.keys(missingDefaults).length > 0) {
      await visitor.updateDataObject(missingDefaults, { lock: { lockId, releaseLock: true } });
    }

    const visitorData = { ...DEFAULT_VISITOR_DATA, ...dataObject } as VisitorDataObjectType;

    return { visitor, visitorData };
  } catch (error) {
    throw standardizeError(error);
  }
};
