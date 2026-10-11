import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { DeviceMasterRow } from '@shared/interfaces';
import { DEVICE_TYPES } from '@shared/utilities/common-data';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
  /** Prose sections keep one field per row — half-width columns wrap them after a few words. */
  singleColumn?: boolean;
}

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : `${value}`;

const yesNo = (value: boolean | null | undefined): string => (value ? 'Yes' : 'No');

/**
 * Read-only device summary for the row detail sheet.
 *
 * The catalog record carries ~70 fields and the grid only shows six of them, so this panel is
 * where the rest stays reachable. The sections are built in the component to keep the template
 * from repeating the same label/value block seventy times.
 */
@Component({
  selector: 'app-device-master-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './device-master-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceMasterDetail {
  readonly device = input<DeviceMasterRow | undefined>();
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  protected readonly deviceTypeLabel = computed(
    () => DEVICE_TYPES.find((type) => type.id === this.device()?.deviceType)?.label ?? '—',
  );

  protected readonly sections = computed<DetailSection[]>(() => {
    const device = this.device();
    if (!device) {
      return [];
    }

    return [
      {
        title: 'Identity',
        items: [
          { label: 'Serial No', value: text(device.sNo) },
          { label: 'Device Code', value: text(device.deviceCode) },
          { label: 'Device Name', value: text(device.deviceName) },
          { label: 'Model No', value: text(device.modelNo) },
          { label: 'Product Code', value: text(device.productCode) },
          { label: 'Company', value: text(device.companyName) },
          { label: 'Brand', value: text(device.brandName) },
          { label: 'Country of Origin', value: text(device.countryOfOrigin) },
          { label: 'Device Type', value: this.deviceTypeLabel() },
          { label: 'Recommended', value: yesNo(device.isRecommended) },
        ],
      },
      {
        title: 'Manufacturer Support',
        items: [
          { label: 'Website', value: text(device.manufacturerWebsite) },
          { label: 'Support Email', value: text(device.supportEmail) },
          { label: 'Support Contact', value: text(device.supportContactNumber) },
        ],
      },
      {
        title: 'Capabilities',
        items: [
          { label: 'Attendance Device', value: yesNo(device.isAttendanceDevice) },
          { label: 'Access Control Device', value: yesNo(device.isAccessControlDevice) },
          { label: 'Face', value: yesNo(device.supportsFace) },
          { label: 'Fingerprint', value: yesNo(device.supportsFingerprint) },
          { label: 'Card', value: yesNo(device.supportsCard) },
          { label: 'PIN', value: yesNo(device.supportsPin) },
          { label: 'QR Code', value: yesNo(device.supportsQrCode) },
          { label: 'Temperature', value: yesNo(device.supportsTemperature) },
        ],
      },
      {
        title: 'Connectivity',
        items: [
          { label: 'HTTP', value: yesNo(device.supportsHttp) },
          { label: 'HTTPS', value: yesNo(device.supportsHttps) },
          { label: 'WebSocket', value: yesNo(device.supportsWebSocket) },
          { label: 'TCP/IP', value: yesNo(device.supportsTcpIp) },
          { label: 'Cloud API', value: yesNo(device.supportsCloudApi) },
          { label: 'Push SDK', value: yesNo(device.supportsPushSdk) },
          { label: 'MQTT', value: yesNo(device.supportsMqtt) },
          { label: 'MQTTS', value: yesNo(device.supportsMqtts) },
          { label: 'Wi-Fi', value: yesNo(device.supportsWifi) },
          { label: 'Ethernet', value: yesNo(device.supportsEthernet) },
          { label: 'USB', value: yesNo(device.supportsUsb) },
          { label: 'TLS Versions', value: text(device.supportedTlsVersions) },
          { label: 'Protocols', value: text(device.supportedProtocols) },
        ],
      },
      {
        title: 'Capacity',
        items: [
          { label: 'Users', value: text(device.maxUserCapacity) },
          { label: 'Faces', value: text(device.maxFaceCapacity) },
          { label: 'Fingerprints', value: text(device.maxFingerprintCapacity) },
          { label: 'Cards', value: text(device.maxCardCapacity) },
          { label: 'Attendance Records', value: text(device.maxAttendanceRecordCapacity) },
        ],
      },
      {
        title: 'Hardware',
        items: [
          { label: 'Firmware Version', value: text(device.firmwareVersion) },
          { label: 'Software Version', value: text(device.softwareVersion) },
          { label: 'Operating System', value: text(device.operatingSystem) },
          { label: 'Processor', value: text(device.processorInfo) },
          { label: 'Memory', value: text(device.memoryInfo) },
          { label: 'Storage', value: text(device.storageInfo) },
          { label: 'Display', value: text(device.displayInfo) },
          { label: 'Camera', value: text(device.cameraInfo) },
          { label: 'Sensor', value: text(device.sensorInfo) },
          { label: 'Power Requirement', value: text(device.powerRequirement) },
          { label: 'Operating Temperature', value: text(device.operatingTemperature) },
          { label: 'Dimensions', value: text(device.dimensions) },
          { label: 'Weight', value: text(device.weight) },
        ],
      },
      {
        title: 'Commercial',
        items: [
          { label: 'Price', value: text(device.price) },
          { label: 'Currency', value: text(device.currencyKey) },
          { label: 'Warranty (months)', value: text(device.warrantyPeriodMonths) },
          { label: 'Warranty Description', value: text(device.warrantyDescription) },
        ],
      },
      {
        title: 'Integration',
        items: [
          { label: 'Integration Supported', value: yesNo(device.isIntegrationSupported) },
          { label: 'Integration Type', value: text(device.integrationType) },
          { label: 'API Documentation', value: text(device.apiDocumentationUrl) },
          { label: 'SDK Documentation', value: text(device.sdkDocumentationUrl) },
        ],
      },
      {
        title: 'Media & Documents',
        items: [
          { label: 'Image', value: text(device.imageUrl) },
          { label: 'Thumbnail', value: text(device.thumbnailUrl) },
          { label: 'Brochure', value: text(device.brochureUrl) },
          { label: 'Manual', value: text(device.manualUrl) },
        ],
      },
      {
        title: 'Notes',
        singleColumn: true,
        items: [
          { label: 'Short Description', value: text(device.shortDescription) },
          { label: 'Description', value: text(device.description) },
          { label: 'Features', value: text(device.features) },
          { label: 'Technical Specifications', value: text(device.technicalSpecifications) },
          { label: 'Additional Info', value: text(device.additionalInfo) },
          { label: 'Remark', value: text(device.remark) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }
}
