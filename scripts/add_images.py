#!/usr/bin/env python3
"""
add_images.py — instruments.json'a eksik Wikimedia Commons görselleri ekler.
Her enstrüman için:
  • node.image  = birincil thumbnail URL (330 px)
  • node.images = [{ src, caption }]
"""
import json, hashlib, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def wikithumb(filename, width=330):
    """Wikimedia Commons thumbnail URL'si üretir."""
    m   = hashlib.md5(filename.encode('utf-8')).hexdigest()
    a, ab = m[0], m[:2]
    enc = urllib.parse.quote(filename, safe='')
    return (
        f'https://upload.wikimedia.org/wikipedia/commons'
        f'/thumb/{a}/{ab}/{enc}/{width}px-{enc}'
    )

# id → (wikimedia_dosyaadı, türkçe_açıklama)
IMAGE_MAP = {
    # ── KORDOFONLAR ──────────────────────────────────────────────────
    # Zithers
    'berimbau':           ('Berimbau.jpg',                             'Berimbau — Brezilya kökenli yay-zither'),
    'uhadi':              ('Umuduri_and_Inanga.jpg',                   'Umuduri ve İnanga — Ruanda tel çalgıları'),
    'pluriarc':           ('Bow_harp.jpg',                             'Pluriarc — Afrika çok yaylı çalgısı'),
    'valiha':             ('Valiha.jpg',                               'Valiha — Madagaskar boru-zither'),
    'sasando':            ('Sasando.jpg',                              'Sasando — Endonezya yaprak-zither'),
    'koto':               ('Koto2.jpg',                                'Koto — Japon on üç telli zither'),
    'gayageum':           ('Gayageum.jpg',                             'Gayageum — Kore geleneksel zither'),
    'kanun':              ('Qanun.jpg',                                'Kanun — Orta Doğu trapezoidal çalgısı'),
    'guqin':              ('Guqin_front_and_back.jpg',                 'Guqin — Çin yedi telli zither'),
    'guzheng':            ('Guzheng.jpg',                              'Guzheng — Çin yirmi bir telli zither'),
    'dan-tranh':          ('Dan_tranh.jpg',                            'Đàn Tranh — Vietnam on altı telli zither'),
    'swarmandal':         ('Swarmandal.jpg',                           'Swarmandal — Hint kutulu zither'),
    'autoharp':           ('Autoharp.jpg',                             'Autoharp — Akor tuşlu zither'),
    'langspil':           ('Langspil.jpg',                             'Langspil — İzlanda geleneksel zither'),
    'gusli':              ('Gusli.jpg',                                'Gusli — Doğu Slav zither'),
    'santur':             ('Santoor.jpg',                              'Santur — Farsça kökenli tokmakla çalınan zither'),
    'cimbalom':           ('Cimbalom.jpg',                             'Cimbalom — Orta Avrupa büyük santurları'),
    'hammered-dulcimer':  ('Hammered_dulcimer_player.jpg',             'Hammered Dulcimer — Tokmakla çalınan zither'),
    'yangqin':            ('Yangqin.jpg',                              'Yangqin — Çin tokmakla çalınan santur'),
    'inanga':             ('Inanga.jpg',                               'İnanga — Ruanda köprülü zither'),
    # Lyres
    'antik-lir':          ('Lyre.jpg',                                 'Antik Yunan Liri'),
    'krar':               ('Krar_player.jpg',                          'Krar — Etiyopya beş telli liri'),
    'nyatiti':            ('Nyatiti.jpg',                              'Nyatiti — Kenya Luo sekiz telli liri'),
    'kithara':            ('Kithara.jpg',                              'Kithara — Antik Yunan profesyonel liri'),
    'begena':             ('Begena.jpg',                               'Begena — Etiyopya on telli liri'),
    # Bowed strings
    'rebap':              ('Rebab.jpg',                                'Rebab — İslam dünyasının en eski yaylı çalgısı'),
    'kemence':            ('Kemanche.jpg',                             'Kemençe — Pers-Türk-Kafkas kemençesi'),
    'erhu':               ('Erhu_player.jpg',                          'Erhu — Çin iki telli kemeni'),
    'morin-khuur':        ('Morin_Khuur.jpg',                          'Morin Khuur — Moğolistan at kılı kemeni'),
    'sarangi':            ('Sarangi_detail.jpg',                       'Sarangi — Kuzey Hindistan yaylı çalgısı'),
    'zhonghu':            ('Zhonghu.jpg',                              'Zhonghu — Çin orta ton huqin ailesi'),
    'ravanahatha':        ('Ravanahatha.jpg',                          'Ravanahatha — Hindistan en eski yaylı çalgısı'),
    'anzad':              ('Imzad.jpg',                                'Anzad (İmzad) — Tuareg tek telli fiddle'),
    'gudok':              ('Gudok.jpg',                                'Gudok — Ortaçağ Rus yaylı çalgısı'),
    # Plucked lutes
    'ud':                 ('Ud_1.jpg',                                 'Ud — Orta Doğu perdessiz lavtası'),
    'sitar':              ('Sitar_and_tabla.jpg',                      'Sitar — Kuzey Hint klasik çalgısı'),
    'tambura':            ('Tanpura.jpg',                              'Tambura / Tanpura — Hint drone çalgısı'),
    'tar':                ('Iranian_tar.jpg',                          'Tar — İran ve Azerbaycan sazı'),
    'setar':              ('Setar.jpg',                                'Setar — Dört telli İran sazı'),
    'rubab':              ('Rubab.jpg',                                'Rubab — Afganistan milli çalgısı'),
    'dombra':             ('Dombra.jpg',                               'Dombra / Dombyra — Kazak telli çalgısı'),
    'komuz':              ('Komuz.jpg',                                'Komuz — Kırgız üç telli sazı'),
    'pipa':               ('Pipa.jpg',                                 'Pipa — Çin armut biçimli çalgısı'),
    'biwa':               ('Biwa_front.jpg',                           'Biwa — Japon armut biçimli sazı'),
    'shamisen':           ('Shamisen.jpg',                             'Shamisen — Japon üç telli çalgısı'),
    'balalaika':          ('Balalaika_front.jpg',                      'Balalaika — Rus üçgen biçimli çalgı'),
    'charango':           ('Charango_mio.jpg',                         'Charango — And Dağları küçük sazı'),
    'cumbus':             ('Cumbus.jpg',                               'Cümbüş — Türk metal kaseli banjo-ud melezi'),
    'dutar':              ('Dutar.jpg',                                'Dutar — Orta Asya iki telli sazı'),
    'bouzouki':           ('Bouzouki.jpg',                             'Bouzouki — Yunan telli çalgısı'),
    'domra':              ('Domra.jpg',                                'Domra — Rus/Ukrayna telli sazı'),
    'sintir':             ('Sintir.jpg',                               'Sintir (Gimbri) — Marakeş Gnawa bas sazı'),
    # Western plucked / bowed
    'klasik-gitar':       ('Classical_guitar_front_png.png',           'Klasik Gitar — Naylon telli Avrupa gitarı'),
    'akustik-gitar':      ('Acoustic_guitar.jpg',                      'Akustik Gitar — Çelik telli folk gitarı'),
    'keman':              ('Violin_VL100.png',                         'Keman — Batı klasik müziğinin soprano yaylısı'),
    'viyola':             ('Bratsche.jpg',                             'Viyola — Kemandan büyük orta ton yaylı çalgı'),
    'viyolonsel':         ('Cello_front_side.png',                     'Viyolonsel — Kucakta çalınan bas yaylı çalgı'),
    'kontrbas':           ('Double_bass_orch.jpg',                     'Kontrbas — Orkestranın en büyük yaylısı'),
    'ukulele':            ('Ukelele_Style.jpg',                        'Ukulele — Hawaii küçük dört telli gitarı'),
    'banjo':              ('Banjo_banjo.jpg',                          'Banjo — Amerikan zar kaseli çalgı'),
    'mandolin':           ('Mandolin_img.jpg',                         'Mandolin — İtalyan sekiz telli armut sazı'),
    'viola-da-gamba':     ('Viola_da_gamba.jpg',                       'Viola da Gamba — Rönesans diz arasında yaylı çalgı'),
    'viola-damore':       ('Viola_damore.jpg',                         'Viola d\'Amore — Sempati telli Barok keman türü'),
    'lavta':              ('Lute.jpg',                                 'Lavta — Rönesans Avrupa lutü'),
    'theorbo':            ('Theorbo_Chlessingh.jpg',                   'Theorbo — Uzun boyunlu Barok lut'),
    'vihuela':            ('Vihuela-de-mano.jpg',                      'Vihuela — İspanya Rönesans gitar atası'),
    'cavaquinho':         ('Cavaquinho.jpg',                           'Cavaquinho — Portekiz küçük dört telli gitarı'),
    'baglama':            ('Baglama.jpg',                              'Bağlama (Saz) — Türk halk müziğinin sembolik çalgısı'),
    'hurdy-gurdy':        ('Hurdy_gurdy.jpg',                          'Hurdy-Gurdy — Çark döndürülerek çalınan Orta Çağ çalgısı'),
    # Keyboard strings
    'piyano':             ('Piano_Schimmel_200.jpg',                   'Piyano — Batı klasik müziğinin temel klavye çalgısı'),
    'cembalo':            ('Harpsichord_German_1710.jpg',              'Cembalo — Barok dönem koparmalı klavye çalgısı'),
    'klavikord':          ('Clavichord_1.jpg',                         'Klavikord — Erken dönem tangent klavye çalgısı'),
    # Harps
    'saung-gauk':         ('Saung-gauk.jpg',                           'Saung Gauk — Myanmar kemerli arfı'),
    'ardin':              ('Ardin.jpg',                                'Ardin — Batı Afrika Moorish harfı'),
    'antik-misir-arpi':   ('Egyptian_harp.jpg',                        'Antik Mısır Arpı — Firavunlar döneminin arfı'),
    'kelt-arpi':          ('Clarsach.jpg',                             'Kelt Arpı (Lever Harp) — İrlanda pedalsız harfı'),
    'paraguay-arpi':      ('Paraguayan_harp.jpg',                      'Paraguaylı Arp — Latin Amerika harfı'),
    'cross-strung-harp':  ('Chromatic_harp.jpg',                       'Çapraz Telli Arp — Çift sıra kromatik harp'),
    'konser-arpi':        ('Full_pedal_harp.jpg',                      'Konser Arpı (Pedal Arpı) — 47 telli orkestra harfı'),
    'kora':               ('Kora_player.jpg',                          'Kora — Batı Afrika yirmi bir telli köprülü arfı'),
    'seperewa':           ('Seperewa.jpg',                             'Seperewa — Gana Akan köprülü zitheri'),
    'ngombi':             ('Ngombi_harp.jpg',                          'Ngombi — Orta Afrika kemerli harfı'),
    'ngoni':              ('Ngoni.jpg',                                'Ngoni — Batı Afrika longneck lutü'),

    # ── AEROFONLAR ───────────────────────────────────────────────────
    # Free reeds
    'harmonika':          ('HarmonicaBar.jpg',                         'Harmonika — Metal kamışlı nefesli çalgı'),
    'akordeon':           ('Accordeon.jpg',                            'Akordeon — Körük tabanlı klavye çalgısı'),
    'bandoneon':          ('Bandoneon.jpg',                            'Bandoneón — Arjantin tangosunun akordeonu'),
    'concertina':         ('Concertina.jpg',                           'Concertina — Altıgen gövdeli küçük akordeon'),
    'melodika':           ('Melodica.jpg',                             'Melodika — Üflemeli serbest kamış klavyesi'),
    'sheng':              ('Sheng_Gu.jpg',                             'Sheng — Çin serbest kamış org çalgısı'),
    'sho':                ('Sho.jpg',                                  'Shō — Japon serbest kamış org çalgısı'),
    'khaen':              ('Khaen.jpg',                                'Khaen — Tayland/Laos bambu org çalgısı'),
    'hulusi':             ('Hulusi.jpg',                               'Hulusi — Yunnan kabak çift borulu çalgısı'),
    'bawu':               ('Bawu.jpg',                                 'Bawu — Yunnan metal dilli yan flüt'),
    'garmon':             ('Garmon.jpg',                               'Garmon — Kafkasya düğme akordeonu'),
    # End-blown flutes
    'ney':                ('Ney.jpg',                                  'Ney — İslam klasik müziğinin kamış flütü'),
    'shakuhachi':         ('Shakuhachi.jpg',                           'Shakuhachi — Japonya Zen geleneği bambu flütü'),
    'xiao':               ('Xiao.jpg',                                 'Xiao — Çin dikine bambu flütü'),
    'quena':              ('Quena.jpg',                                'Quena — And Dağları kamış flütü'),
    'kaval':              ('Kaval.jpg',                                'Kaval — Balkan ve Türk çoban flütü'),
    'fujara':             ('Fujara.jpg',                               'Fujara — Slovakya uzun çoban flütü'),
    'danso':              ('Danso.jpg',                                'Danso — Kore bambu uç flütü'),
    # Panpipes
    'panpipe':            ('Pan_pipes.jpg',                            'Panflüt (Panpipes) — Çoklu boru nefesli çalgı'),
    'nai':                ('Nai.jpg',                                  'Nai — Romanya ve Orta Doğu panflütü'),
    'siku':               ('Siku_Bolivian_panpipes.jpg',               'Siku / Zampoña — And Dağları ikili panflütü'),
    # Transverse flutes
    'yan-flut':           ('Western_concert_flute.jpg',                'Yan Flüt (Konser Flütü) — Batı orkestrası gümüş flütü'),
    'pikolo':             ('Piccolo.jpg',                              'Pikolo — Konser flütünün küçük versiyonu'),
    'alto-flut':          ('Alto_flute.jpg',                           'Alto Flüt — Konser flütünden dördüncü altta'),
    'bas-flut':           ('Bass_flute.jpg',                           'Bas Flüt — Flüt ailesinin en pest üyesi'),
    'bansuri':            ('Bansuri.jpg',                              'Bansuri — Kuzey Hindistan klasik bambu flütü'),
    'dizi':               ('Dizi.jpg',                                 'Dizi — Dimo zarı kaplı Çin flütü'),
    'daegeum':            ('Daegeum.jpg',                              'Daegeum — Kore büyük bambu flütü'),
    'ryuteki':            ('Ryuteki.jpg',                              'Ryūteki — Japon gagaku çapraz flütü'),
    'fife':               ('Fife.jpg',                                 'Fife — Askeri küçük metal flüt'),
    # Vessel flutes
    'okarina':            ('Ocarina.jpg',                              'Okarina — Kil gövdeli çanak flüt'),
    'xun':                ('Xun.jpg',                                  'Xun — Çin neolitik kil flütü'),
    # Fipple flutes
    'blokflut':           ('Recorder_(PSF).png',                       'Blokflüt (Recorder) — Kanal ağızlıklı düdük'),
    'tin-whistle':        ('Tin_Whistle.jpg',                          'Tin Whistle — İrlanda metal düdüğü'),
    'flageolet':          ('Flageolet.jpg',                            'Flageolet — Fransız küçük fipple flütü'),
    'txistu':             ('Txistu_0003.jpg',                          'Txistu — Bask üç delikli geleneksel düdük'),
    # Ancient
    'aulos':              ('Aulos.jpg',                                'Aulos — Antik Yunan çift borulu çalgısı'),
    # Double reeds
    'obua':               ('Oboe_modern.jpg',                          'Obua — Orkestra konik çift kamışlı çalgısı'),
    'fagot':              ('Bassoon_German.jpg',                       'Fagot — Orkestranın en büyük tahta nefeslisi'),
    'kontrafagot':        ('Contrafagot.jpg',                          'Kontrafagot — Fagotun bas versiyonu'),
    'ingiliz-kornosu':    ('Cor_anglais.jpg',                          'İngiliz Kornosu (Cor Anglais) — Obua ailesi alto'),
    'zurna':              ('Zurna.jpg',                                'Zurna — Türk ve Balkan çift kamışlı düdüğü'),
    'shehnai':            ('Shehnai.jpg',                              'Shehnai — Kuzey Hindistan tapınak obosi'),
    'suona':              ('Suona.jpg',                                'Suona — Çin metal zurnası'),
    'duduk':              ('Duduk.jpg',                                'Duduk — Ermenistan geniş kamışlı erik düdüğü'),
    'mey':                ('Mey.jpg',                                  'Mey — Anadolu geniş çift kamışlı düdüğü'),
    'piri':               ('Piri.jpg',                                 'Piri — Kore çift kamışlı düdüğü'),
    'hichiriki':          ('Hichiriki.jpg',                            'Hichiriki — Japon gagaku çift kamışlı düdüğü'),
    'crumhorn':           ('Crumhorn.jpg',                             'Crumhorn — Rönesans kapaklı kamışlı çalgısı'),
    'shawm':              ('Shawm.jpg',                                'Shawm (Ortaçağ Zurna) — Zurna\'nın Avrupa prototipi'),
    'gayda':              ('Bagpipes.jpg',                             'Gayda — Borulu hava torbalı Balkan gaydası'),
    # Single reeds - Clarinets
    'klarnet':            ('Klarinetten.jpg',                          'Klarnet — Tek kamışlı silindirik nefesli çalgı'),
    'bas-klarnet':        ('Bass_clarinet_full.jpg',                   'Bas Klarnet — Klarnetten bir oktav altta'),
    'basset-horn':        ('Bassethorn.jpg',                           'Basset Horn — Alto aralığında klarnet'),
    'chalumeau':          ('Chalumeau.jpg',                            'Chalumeau — Klarnetin 17. yüzyıl öncüsü'),
    'zhaleika':           ('Zhaleika.jpg',                             'Zhaleika — Rus tek kamışlı halk düdüğü'),
    # Saxophones
    'soprano-saksofon':   ('Soprano_saxophone.jpg',                    'Soprano Saksofon — Saksofon ailesinin en ince sesi'),
    'alto-saksofon':      ('Alto_Sax_Yamaha.jpg',                      'Alto Saksofon — En yaygın saksofon'),
    'tenor-saksofon':     ('Tenor_saxophone.jpg',                      'Tenor Saksofon — Cazın saksofonu'),
    'bariton-saksofon':   ('Baritone_Saxophone.jpg',                   'Bariton Saksofon — Saksofon ailesi bas üyesi'),
    'bas-saksofon':       ('Bass_Saxophone.jpg',                       'Bas Saksofon — Saksofon ailesinin en büyüğü'),
    'tarogato':           ('Tarogato.jpg',                             'Tárogató — Macar tek kamışlı tahta çalgı'),
    # Brass - Natural
    'sank':               ('Shankha.jpg',                              'Şank — Hint ritüel deniz kabuğu borusu'),
    'putatara':           ('Putatara.jpg',                             'Pūtātara — Maori konk kabuğu çalgısı'),
    'didgeridoo':         ('Didgeridoo_player.jpg',                    'Didgeridoo — Avustralya yerli borusal ahşap çalgısı'),
    'alp-hornu':          ('Alphorn.jpg',                              'Alp Hornu (Alphorn) — İsviçre çoban tahta borusu'),
    'shofar':             ('Shofar.jpg',                               'Shofar — Yahudi ritüel koç boynuzu borusu'),
    'lur':                ('Lur.jpg',                                  'Lur — İskandinav Bronz Çağı metal borusu'),
    'bugle':              ('Bugle_2.jpg',                              'Bugle (Boru) — Valfsiz askeri işaret borusu'),
    'vuvuzela':           ('Vuvuzela_2010_FIFA_World_Cup.jpg',         'Vuvuzela — Güney Afrika stadyum borusu'),
    'kornetto':           ('Cornetto.jpg',                             'Kornetto / Zink — Rönesans ahşap-metal hibrit'),
    'serpent':            ('Serpent_Instrument.jpg',                   'Serpent — Yılan biçimli Rönesans ahşap üflemeli'),
    # Brass - Slide / Valved
    'trombon':            ('Posaune_1000.jpg',                         'Trombon — Sürgülü borulu pirinç çalgı'),
    'sackbut':            ('Sackbut.jpg',                              'Sackbut (Rönesans Trombonu) — Trombonun atası'),
    'trompet':            ('Trumpet_bb.jpg',                           'Trompet — Pirinç üfleme soprano çalgısı'),
    'kornet':             ('Cornet.jpg',                               'Kornet — Konik gövdeli trompet'),
    'flugelhorn':         ('Flugelhorn.jpg',                           'Flügelhorn — Piston valf konik üflemeli'),
    'korno':              ('French_horn.jpg',                          'Fransız Kornosu (French Horn) — Spiral borulu pirinç çalgı'),
    'tuba':               ('Tuba.jpg',                                 'Tuba — Orkestranın en büyük pirinç çalgısı'),
    'sousaphone':         ('Sousaphone.jpg',                           'Sousaphone — Vücuda sarılan bas tuba'),
    'euphonium':          ('Euphonium.jpg',                            'Euphonium (Öfonyum) — Boru bandosu tenor çalgısı'),
    'wagner-tuba':        ('Wagner_tuba.jpg',                          'Wagner Tuba — Wagner\'ın özel pirinç melezi'),
    'mellophone':         ('Mellophone.jpg',                           'Mellophone — Marching band korno yedeği'),

    # ── İDİOFONLAR ───────────────────────────────────────────────────
    'vızıldak':           ('Bullroarer.jpg',                           'Vızıldak (Bullroarer) — Hızla döndürülen tahta pervane'),
    'kamçı':              ('Whipcrack.jpg',                            'Kamçı (Whip/Slapstick) — Tiyatro efekt çarpışma çalgısı'),
    'claves':             ('Claves2.jpg',                              'Claves — Küba Latin ritim çubukları'),
    'plaka-carpara':      ('Concussion_plates.jpg',                    'Plaka Çalparalar — Düz levha çarpışma idiofonları'),
    'kastanyet':          ('Castanets2.jpg',                           'Kastanyet — İspanya flamenko el çıngırağı'),
    'parmak-zilleri':     ('Finger_cymbals_1.jpg',                     'Parmak Zilleri — Orta Doğu küçük bronz zilleri'),
    'agogo':              ('Agogo_bells.jpg',                          'Agogo Çanları — Batı Afrika çift metal çanı'),
    'ucgen':              ('Triangle_instrument.jpg',                  'Üçgen — Metal çubuğa vurma orkestra çalgısı'),
    'ksilofon':           ('Xylophone_arp.jpg',                        'Ksilofon — Tahta çubuklu tokmak çalgı'),
    'marimba':            ('Marimba_de_Guatemala.jpg',                 'Marimba — Geniş tahta çubuklu Orta Amerika xilofonu'),
    'balafon':            ('Balafon.jpg',                              'Balafon — Batı Afrika kabak rezonatörlü xilofon'),
    'pong-lang':          ('Pong_lang.jpg',                            'Pong Lang — Tayland/Laos tahta boru xilofonu'),
    'kulintang-a-kayo':   ('Kulintang_a_kayo.jpg',                     'Kulintang a Kayo — Filipinler tahta gong seti'),
    'ksilorimba':         ('Xylorimba.jpg',                            'Ksilorimba — Ksilofon ile marimbayı birleştiren çalgı'),
    'glockenspiel':       ('Glockenspiel2.jpg',                        'Glockenspiel — Metal çubuklu küçük xilofon'),
    'vibrafon':           ('Vibraphone_Yamaha.jpg',                    'Vibrafon — Motor döndürmeli metal çubuk çalgı'),
    'celesta':            ('Celesta_full.jpg',                         'Celesta — Tuşlu metal çubuk çalgısı'),
    'crotales':           ('Crotales.jpg',                             'Crotales (Antik Ziller) — Küçük pirinç disk çiftleri'),
    'kempul':             ('Kempul.jpg',                               'Kempul — Cava gamelan asılı gong seti'),
    'yarik-davul':        ('Slit_drum.jpg',                            'Yarık Davul (Slit Drum) — Oyulmuş ağaç gövdeli çalgı'),
    'tubular-bells':      ('Tubular_bells.jpg',                        'Tübüler Çanlar — Dikey asılı metal boru seti'),
    'mark-tree':          ('Mark_tree.jpg',                            'Mark Tree — Asılı metal çubuk rüzgâr zili'),
    'gong':               ('Gong_01.jpg',                              'Gong ve Tam-Tam — Büyük asılı disk metal çalgı'),
    'bonang':             ('Bonang.jpg',                               'Bonang ve Gong Setleri — Cava gamelan yatay gong seti'),
    'singing-bowl':       ('Singing_bowl.jpg',                         'Singing Bowl (Tibet Çanağı) — Budist çan kasesi'),
    'kilise-cani':        ('Church_bell.jpg',                          'Kilise Çanı — Bronz dökme büyük çan'),
    'carillon':           ('Carillon.jpg',                             'Carillon — Klavye kontrollü kule çanları'),
    'ogene':              ('Ogene.jpg',                                'Ogene — Nijerya Igbo demir çift çanı'),
    'gankogui':           ('Gankogui.jpg',                             'Gankogui — Batı Afrika Ewe çift demir çanı'),
    'cajon':              ('Cajón.jpg',                                'Cajón — Peru kökenli kutulu vurmalı çalgı'),
    'handpan':            ('Handpan_drum.jpg',                         'Handpan / Hang Drum — İsviçre metal kubbe çalgısı'),
    'tahta-blok':         ('Woodblock.jpg',                            'Tahta Blok ve Tapınak Bloku — Oyuk tahta vurma çalgıları'),
    'litofon':            ('Lithophone.jpg',                           'Litofon — Taş plakalardan yapılmış prehistorik çalgı'),
    'sistrum':            ('Sistrum.jpg',                              'Sistrum — Antik Mısır sallanır çıngırağı'),
    'shekere':            ('Shekere.jpg',                              'Shekere — Boncuk ağlı Afrika kabak çıngırağı'),
    'marakas':            ('Maracas.jpg',                              'Marakas — Latin Amerika tohumlu kabak çıngırağı'),
    'shaker':             ('Egg_shaker.jpg',                           'Shaker ve Egg Shaker — Plastik yumurta ritim çıngırağı'),
    'cabasa':             ('Cabasa.jpg',                               'Cabasa / Afuche — Metal boncuk sarmalı kaşıyıcı'),
    'rainstick':          ('Rainstick.jpg',                            'Rainstick (Yağmur Çubuğu) — Tohum dolu boru çıngırağı'),
    'hosho':              ('Hosho.jpg',                                'Hosho — Zimbabwe Shona kabak çıngırağı'),
    'flexatone':          ('Flexatone.jpg',                            'Flexatone ve Vibraslap — Esnek metal levha çalgısı'),
    'guiro':              ('Guiro.jpg',                                'Güiro — Nervürlü yüzeyli kaşıyıcı çalgı'),
    'reco-reco':          ('Reco-reco.jpg',                            'Reco-Reco — Brezilya bambu nervür kaşıyıcı'),
    'matraca':            ('Matraca.jpg',                              'Matraca (Dişli Çıngırak) — Pul dişli döner çıngırak'),
    'kouxian-split':      ('Kouxian.jpg',                              'Kouxian (Yarık Tip) — Çin metal ağız arfı'),
    'agiz-kopuzu':        ('Maultrommel.jpg',                          'Ağız Kopuzu (Jew\'s Harp) — Metal dil ağız çalgısı'),
    'kubing':             ('Kubing.jpg',                               'Kubing / Genggong — Filipinler bambu ağız arfı'),
    'mbira':              ('Mbira_dzavadzimu.jpg',                     'Mbira / Sanza — Zimbabwe Shona lamelofonu'),
    'kalimba':            ('Kalimba.jpg',                              'Kalimba — Modern metal dilli Afrika lamelofonu'),
    'likembe':            ('Likembe.jpg',                              'Likembe / Kisanji — Orta Afrika metal dil lamelofonu'),
    # Friction / Mechanical
    'muzik-kutusu':       ('Reuge_music_box.jpg',                      'Müzik Kutusu — Pimli silindir mekanizmalı otomatik çalgı'),
    'civi-kemani':        ('Nagel_Geige.jpg',                          'Çivi Kemanı (Nail Violin) — Çivilere yay sürtülen çalgı'),
    'cam-armonika':       ('Glass_harmonica.jpg',                      'Cam Armonika — Dönen cam kase dizisi'),
    'kase-seti':          ('Glass_harp.jpg',                           'Sürtme Kap Setleri — Parmakla döndürülen cam dizisi'),
    'piano-chanteur':     ('Piano_Chanteur.jpg',                       'Piano Chanteur — Tuşlu yay-kirişli çalgı'),
    'muzikal-testere':    ('Musical_saw_player.jpg',                   'Müzikal Testere — Bükülmüş testereye yay çekilmesi'),
    'thunder-sheet':      ('Thunder_sheet.jpg',                        'Gök Gürültüsü Levhası — Titretilen metal sac'),
    'wobble-board':       ('Wobble_board.jpg',                         'Wobble Board — Titreşimli sac levha çalgısı'),
    'ses-degistirici':    ('Voice_modifier.jpg',                       'Ses Değiştirici İdiofonlar'),
    'zilli-masa':         ('Zilli_masa.jpg',                           'Zilli Maşa — Osmanlı ritüel bakır maşa-zil çalgısı'),

    # ── MEMBRANOFONLAR ───────────────────────────────────────────────
    'timpani':            ('Timpani2.jpg',                             'Timpani — Akort edilebilir kazan davul'),
    'nakkare':            ('Naqqara.jpg',                              'Nakkare / Naqqara — Çift küçük kazan davul'),
    'tabla-bayan':        ('Tabla_single.jpg',                         'Tabla (Bayan – Bas Kazan) — Hindustani bas davulu'),
    'nakry':              ('Nakry.jpg',                                'Nakry (Litvra) — Eski Avrupa kazan davulu'),
    'tom-tom':            ('Tom_drum.jpg',                             'Tom-Tom — Silindirik bateri davulu'),
    'bas-davul':          ('Bass_drum.jpg',                            'Bas Davul — Orkestranın en büyük davulu'),
    'davul':              ('Davul_Zurna.jpg',                          'Davul (Türk) — Türk halk müziğinin silindirik davulu'),
    'snare':              ('Snaredrum.jpg',                            'Trampet / Snare Drum — Yarak teli gerilmiş davul'),
    'taiko':              ('Taiko.jpg',                                'Taiko — Japon büyük davul geleneği'),
    'dhol':               ('Dhol.jpg',                                 'Dhol — Güney Asya çift kaplı silindirik davul'),
    'surdo':              ('Surdo.jpg',                                'Surdo — Brezilya samba bas davulu'),
    'repinique':          ('Repinique.jpg',                            'Repinique — Brezilya samba tenör davulu'),
    'drum-kit':           ('Drum_kit.jpg',                             'Bateri Seti — Çoklu davul ve zil seti'),
    'dholak':             ('Dholak.jpg',                               'Dholak — Güney Asya konik çift kaplı davul'),
    'mridangam':          ('Mridangam.jpg',                            'Mridangam — Karnatak müziği davulu'),
    'pakhavaj':           ('Pakhavaj.jpg',                             'Pakhavaj — Kuzey Hindistan klasik davulu'),
    'madal':              ('Madal.jpg',                                'Madal — Nepal ulusal davulu'),
    'kendang':            ('Kendang.jpg',                              'Kendang — Endonezya gamelan konik davulu'),
    'konusan-davul':      ('Talking_drum.jpg',                         'Konuşan Davul — Koltukaltı akort davulu'),
    'changgo':            ('Janggu.jpg',                               'Changgo / Janggu — Kore kum saati biçimli davul'),
    'damaru':             ('Damaru.jpg',                               'Damaru — Şiva küçük kum saati davulu'),
    'tsuzumi':            ('Tsuzumi.jpg',                              'Tsuzumi / Kakko — Japon kum saati davulları'),
    'bata':               ('Bata_drums.jpg',                           'Batá — Küba Yoruba dini davulları'),
    'tama':               ('Tama.jpg',                                 'Tama — Senegal konuşan davulu'),
    'dundun':             ('Dundun.jpg',                               'Dundun — Yoruba ipli akort çift davul'),
    'djembe':             ('Djembe.jpg',                               'Djembe — Batı Afrika goblet deri davulu'),
    'conga':              ('Conga.jpg',                                'Conga / Tumbadora — Küba uzun davulları'),
    'atabaque':           ('Atabaque.jpg',                             'Atabaque — Brezilya Candomblé davulu'),
    'sabar':              ('Sabar.jpg',                                'Sabar — Senegal Wolof uzun davulu'),
    'darbuka':            ('Darbuka.jpg',                              'Darbuka / Doumbek — Orta Doğu goblet davulu'),
    'tombak':             ('Tombak.jpg',                               'Tombak / Zarb — İran klasik goblet davulu'),
    'tef':                ('Tef.jpg',                                  'Tef / Def — Türk çerçeve davulu'),
    'bendir':             ('Bendir.jpg',                               'Bendir — Kuzey Afrika çerçeve davulu'),
    'bodhran':            ('Bodhrán.jpg',                              'Bodhrán — İrlanda tek kaplı çerçeve davulu'),
    'pandeiro':           ('Pandeiro.jpg',                             'Pandeiro — Brezilya zilli çerçeve davulu'),
    'riq':                ('Riq.jpg',                                  'Riq / Rik — Arap müziği zilli çerçeve davulu'),
    'daf':                ('Daf.jpg',                                  'Daf / Dayereh — İran büyük çerçeve davulu'),
    'kanjira':            ('Kanjira.jpg',                              'Kanjira — Karnatak müziği zilli çerçeve davulu'),
    'tamburello':         ('Tamburello.jpg',                           'Tamburello — İtalya zilli çerçeve davulu'),
    'bongo':              ('Bongo_drums.jpg',                          'Bongo — Küba çift küçük davulları'),
    'tabla':              ('Tabla.jpg',                                'Tabla — Kuzey Hindistan el davulları'),
    'ocean-drum':         ('Ocean_drum.jpg',                           'Ocean Drum — İki kaplı boncuklu ses efekti'),
    'ghatam':             ('Ghatam.jpg',                               'Ghatam — Karnatak müziği kil testi davulu'),
    'udu':                ('Udu_drum.jpg',                             'Udu — Nijerya delikli kil testi davulu'),
    'pellet-drum':        ('Pellet_drum.jpg',                          'Pellet Drum — Çıngıraklı sallama davulu'),
    'gopi-yantra':        ('Gopi_yantra.jpg',                          'Gopi Yantra / Ektara — Hindistan tek telli kutu'),
    'ananda-lahari':      ('Ananda_lahari.jpg',                        'Ananda Lahari — Güney Hindistan davul yayı'),
    'cuica':              ('Cuica.jpg',                                'Cuíca — Brezilya samba sürtme davulu'),
    'zambomba':           ('Zambomba.jpg',                             'Zambomba — İspanya sürtme davulu'),
    'rommelpot':          ('Rommelpot.jpg',                            'Rommelpot — Hollanda sürtme davulu'),
    'lions-roar':         ('Lions_roar.jpg',                           'Aslan Kükremesi (Lion\'s Roar) — İpli sürtme davul'),
    # Mirlitons
    'kazoo':              ('Kazoo.jpg',                                'Kazoo — Kâğıt membranı ses dönüştürücü düdük'),
    'tarak-kagit':        ('Comb_and_paper.jpg',                       'Tarak ve Kâğıt — Mirliton türevi çalgı'),
    'eunuch-flute':       ('Mirliton.jpg',                             'Eunuch Flüt — Mum kâğıdı membranı flüt'),

    # ── ELEKTROFONlar ────────────────────────────────────────────────
    'elektro-gitar':      ('Stratocaster_wb_sb.jpg',                   'Elektro Gitar — Katı gövdeli amfili gitar'),
    'elektro-bas':        ('Fender_Jazz_Bass.jpg',                     'Elektro Bas Gitar — Dört telli elektrik bas'),
    'elektro-keman':      ('Electric_violin.jpg',                      'Elektro Keman — Amfili solid-body keman'),
    'elektro-viyolonsel': ('Electric_cello.jpg',                       'Elektro Viyolonsel — Amfili katı gövdeli viyolonsel'),
    'steel-guitar':       ('Steel_guitar.jpg',                         'Steel Gitar / Pedal Steel — Hawaii stili bar gitar'),
    'elektro-vibrafon':   ('Vibraphone_Yamaha.jpg',                    'Elektro Vibrafon — Motorlu rezonatörlü vibrafon'),
    'hammond-org':        ('Hammond_organ.jpg',                        'Hammond Org — Tone wheel elektrik org'),
    'telharmonium':       ('Telharmonium.jpg',                         'Telharmonium — İlk elektrik müzik aleti (1897)'),
    'elektrik-piyano':    ('Rhodes_electric_piano.jpg',                'Elektrik Piyano — Çatal rezonanslı Fender Rhodes'),
    'mellotron':          ('Mellotron_m400.jpg',                       'Mellotron — Bant tabanlı klavye org taklidi'),
    'theremin':           ('Theremin_demonstration.jpg',               'Theremin — Elleri değmeden çalınan elektronik çalgı'),
    'ondes-martenot':     ('Ondes_Martenot.jpg',                       'Ondes Martenot — Fransız elektronik tel çalgısı'),
    'trautonium':         ('Trautonium.jpg',                           'Trautonium — 1930\'ların Alman elektronik sazı'),
    'synthesizer':        ('Minimoog.jpg',                             'Synthesizer — Elektronik ses üretimi'),
    'sampler':            ('Ensoniq_ASR-10.jpg',                       'Sampler — Dijital ses örnekleme klavyesi'),
    'drum-machine':       ('Roland_TR-808.jpg',                        'Ritim Makinesi (Drum Machine) — Elektronik ritim kutusu'),
    'midi-kontrolcusu':   ('MIDI_keyboard.jpg',                        'MIDI Kontrolcüsü — Dijital müzik arabirimi'),
    'elektronik-davul':   ('Electronic_drum_kit.jpg',                  'Elektronik Davul Seti — Ses modüllü ped-davul seti'),
    'vocoder':            ('Vocoder.jpg',                              'Vocoder — Ses analiz-sentez elektroniği'),
    'seaboard':           ('ROLI_Seaboard.jpg',                        'Seaboard / Roli — Sürekli dokunma MIDI klavyesi'),
    'eigenharp':          ('Eigenharp.jpg',                            'Eigenharp — Çok boyutlu dokunma sensörlü çalgı'),
    'clavioline':         ('Clavioline.jpg',                           'Clavioline — 1940\'ların monofonik elektronik klavyesi'),
}

# ── instruments.json güncelle ─────────────────────────────────────
with open(ROOT / 'data' / 'instruments.json', encoding='utf-8') as f:
    data = json.load(f)

updated = 0

def process(node):
    global updated
    if isinstance(node, list):
        for item in node:
            process(item)
        return
    nid = node.get('id', '')
    if nid in IMAGE_MAP and not node.get('image'):
        filename, caption = IMAGE_MAP[nid]
        url = wikithumb(filename)
        node['image']  = url
        node['images'] = [{'src': url, 'caption': caption}]
        updated += 1
    for c in node.get('children', []):
        process(c)

process(data)

with open(ROOT / 'data' / 'instruments.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'✓ {updated} enstrümana görsel eklendi.')

# Hâlâ eksik olanları say
still_missing = []
def check(node):
    if isinstance(node, list):
        for item in node: check(item)
        return
    if node.get('id') and not node.get('children') and not node.get('image'):
        still_missing.append(node['id'])
    for c in node.get('children', []): check(c)
check(data)
if still_missing:
    print(f'Hâlâ görsel eksik ({len(still_missing)}):')
    for s in still_missing:
        print(f'  - {s}')
else:
    print('✓ Tüm enstrümanların görseli var!')
