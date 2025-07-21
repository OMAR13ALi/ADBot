export interface OrganizationalUnit {
    Name: string;
    DistinguishedName: string;
    Description: string | null;
  }
  
  export interface OUsResponse {
    organizational_units: OrganizationalUnit[];
    count: number;
    status: string;
  }